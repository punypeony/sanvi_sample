import mongoose from 'mongoose';
import { AuditLog, models, Order, Product, Review, User } from '../models/index.js';
import { generatePassword, hashPassword } from '../utils/password.js';
import {
  assertCatalogShape,
  buildOrders,
  buildReviewPlans,
  CUSTOMER,
  productFromCatalog,
} from './placeholders.js';
import { catalog } from '../../../shared/catalog.js';

function adminEmail() {
  return (process.env.ADMIN_EMAIL || 'admin@example.com').trim().toLowerCase();
}

function chosenAdminPassword() {
  const value = (process.env.ADMIN_PASSWORD || '').trim();
  if (!value) return { password: generatePassword(), generated: true };
  if (value.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters.');
  }
  return { password: value, generated: false };
}

function createdMessage(role, email, password, generated) {
  const passwordLine = generated ? `  password: ${password}` : '  password: taken from ADMIN_PASSWORD';
  return [
    `Placeholder ${role} created.`,
    `  email: ${email}`,
    passwordLine,
    'Change this password before anyone else can reach this machine.',
    'It is not stored in the repo. Running the seed again does not reset it.',
  ].join('\n');
}

async function ensureCollections() {
  const names = new Set(
    (await mongoose.connection.db.listCollections().toArray()).map((item) => item.name),
  );
  for (const model of models) {
    if (!names.has(model.collection.collectionName)) await model.createCollection();
    await model.syncIndexes();
  }
}

async function ensureUser({ email, name, role, addresses, announce, write }) {
  const existing = await User.findOne({ email });
  if (existing) {
    if (announce) {
      write(`Placeholder ${role} already exists (${email}). The password was left as it is.`);
    }
    return { created: false, id: existing._id };
  }

  const fromEnv = role === 'admin' ? chosenAdminPassword() : { password: generatePassword(), generated: true };
  const user = await User.create({
    email,
    name,
    role,
    addresses,
    passwordHash: await hashPassword(fromEnv.password),
    isActive: true,
    placeholder: true,
  });
  if (announce) write(createdMessage(role, email, fromEnv.password, fromEnv.generated));
  return {
    created: true,
    id: user._id,
    password: fromEnv.generated ? fromEnv.password : undefined,
  };
}

export async function runSeed({ log = console.log } = {}) {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('Connect to Mongo before seeding.');
  }
  assertCatalogShape();
  const write = (message) => {
    if (log) log(message);
  };

  const reviews = buildReviewPlans();
  const admin = adminEmail();
  const reserved = new Set(reviews.map((review) => review.email));
  reserved.add(CUSTOMER.email);
  if (reserved.has(admin) || admin === CUSTOMER.email) {
    throw new Error('ADMIN_EMAIL collides with a placeholder account. Choose a different email.');
  }

  await ensureCollections();

  const flagships = catalog.products.filter((item) => item.flagship);
  if (flagships.length !== 1) throw new Error('The catalog needs exactly one flagship product.');

  for (const source of catalog.products) {
    const existing = await Product.findOne({ id: source.id });
    const next = productFromCatalog(source, existing?.toObject());
    const doc = existing ?? new Product();
    doc.set(next);
    if (source.compareAtPrice == null) doc.compareAtPrice = undefined;
    await doc.save();
  }

  const adminUser = await ensureUser({
    email: admin,
    name: 'Placeholder admin',
    role: 'admin',
    announce: true,
    write,
  });
  if (adminUser.created) {
    const existingLog = await AuditLog.findOne({ action: 'seed.admin', target: `user:${admin}` });
    if (!existingLog) {
      await AuditLog.create({
        actorId: adminUser.id,
        action: 'seed.admin',
        target: `user:${admin}`,
        before: '',
        after: 'placeholder admin created',
        placeholder: true,
      });
    }
  }

  const customer = await ensureUser({
    email: CUSTOMER.email,
    name: CUSTOMER.name,
    role: 'customer',
    addresses: CUSTOMER.addresses,
    announce: true,
    write,
  });

  for (const review of reviews) {
    const author = await ensureUser({
      email: review.email,
      name: review.name,
      role: 'customer',
      announce: false,
      write,
    });
    const existing = await Review.findOne({ id: review.id });
    if (!existing) {
      await Review.create({
        id: review.id,
        productId: review.productId,
        userId: author.id,
        rating: review.rating,
        text: review.text,
        colorway: review.colorway,
        status: review.status,
        placeholder: true,
      });
    }
  }

  for (const order of buildOrders()) {
    const existing = await Order.findOne({ orderNumber: order.orderNumber });
    if (existing) continue;
    const { owner, ...doc } = order;
    if (owner === 'customer') doc.userId = customer.id;
    await Order.create(doc);
  }

  const [products, reviewCount, orders, users] = await Promise.all([
    Product.countDocuments(),
    Review.countDocuments(),
    Order.countDocuments(),
    User.countDocuments(),
  ]);
  write(
    `Seed complete on database "${mongoose.connection.name}". ${products} products, ${reviewCount} reviews, ${orders} orders, ${users} users.`,
  );

  return {
    products,
    reviews: reviewCount,
    orders,
    users,
    generated: [adminUser, customer].filter((item) => item.created && item.password),
  };
}
