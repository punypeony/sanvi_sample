import { HttpError } from '../utils/httpError.js';
import { Product } from '../models/Product.js';

// One colorway update. direction -1 reserves, +1 puts stock back.
// The stock string is written in the same update so a later read matches the count.
function pipeline(line, direction) {
  const nextCount = direction < 0
    ? { $subtract: ['$$color.stockCount', line.quantity] }
    : { $add: ['$$color.stockCount', line.quantity] };
  return [
    {
      $set: {
        colorways: {
          $map: {
            input: '$colorways',
            as: 'color',
            in: {
              $cond: [
                { $eq: ['$$color.id', line.colorId] },
                {
                  $mergeObjects: [
                    '$$color',
                    {
                      stockCount: nextCount,
                      stock: {
                        $cond: [{ $gt: [nextCount, 0] }, 'in_stock', 'out_of_stock'],
                      },
                    },
                  ],
                },
                '$$color',
              ],
            },
          },
        },
      },
    },
  ];
}

export async function reserveLines(lines) {
  const reserved = [];
  try {
    for (const line of lines) {
      const updated = await Product.findOneAndUpdate(
        {
          id: line.productId,
          active: true,
          colorways: { $elemMatch: { id: line.colorId, stockCount: { $gte: line.quantity } } },
        },
        pipeline(line, -1),
        { returnDocument: 'after', updatePipeline: true },
      );
      if (!updated) throw new HttpError(409, `${line.name} in ${line.colorName} is out of stock.`);
      reserved.push(line);
    }
  } catch (error) {
    await releaseLines(reserved);
    throw error;
  }
}

export async function releaseLines(lines) {
  for (const line of lines) {
    await Product.updateOne(
      { id: line.productId, 'colorways.id': line.colorId },
      pipeline(line, 1),
      { updatePipeline: true },
    );
  }
}
