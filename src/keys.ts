import nacl from "tweetnacl";

export async function generateKeyPair() {
  const bobKp = nacl.box.keyPair();
  return {
    public: toHexString(bobKp.publicKey),
    private: toHexString(bobKp.secretKey),
  };
}

export const toHexString = (bytes: Uint8Array) =>
  Array.from(bytes).reduce(
    (str, byte) => str + byte.toString(16).padStart(2, "0"),
    ""
  );

export const fromHexString = (hexString: string) => {
  let match = hexString.match(/.{1,2}/g);
  if (match === null) {
    throw new Error("Wrong string provided!");
  }
  return new Uint8Array(match.map((byte) => parseInt(byte, 16)));
};
