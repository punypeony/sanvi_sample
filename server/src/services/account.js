import { User } from '../models/User.js';
import { attachGuestOrders, countGuestOrders } from './orders.js';
import { presentUser } from './auth.js';

export async function updateProfile(user, { name, addresses }) {
  user.name = name;
  user.addresses = addresses;
  await user.save();
  const fresh = await User.findById(user._id);
  return presentUser(fresh);
}

export async function attachOrders(user) {
  const attached = await attachGuestOrders(user);
  return { attached, guestOrderCount: await countGuestOrders(user.email) };
}
