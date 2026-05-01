import bcrypt from 'bcryptjs';

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

// import argon2 from 'argon2';

// export async function hashPassword(plain: string): Promise<string> {
//   return argon2.hash(plain, {
//     type: argon2.argon2id,
//     memoryCost: 65536,
//     timeCost: 3,
//     parallelism: 1,
//   });
// }

// export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
//   try {
//     return await argon2.verify(hash, plain);
//   } catch {
//     return false;
//   }
// }
