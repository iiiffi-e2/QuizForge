import { customAlphabet } from "nanoid";

const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const nanoid8 = customAlphabet(alphabet, 8);

export function generateJoinCode(): string {
  return nanoid8();
}
