//@ts-ignore
import aes from "aes-js";
import { AccountData } from "./App";

const accountInfoKey = "accountInfo";

export function hasDataSaved() {
  const currentData = localStorage.getItem(accountInfoKey);
  return currentData != null;
}

export function saveData(data: string) {
  localStorage.setItem(accountInfoKey, data);
}

export function getData(password: string) {
  const currentData = localStorage.getItem(accountInfoKey);
  if (currentData == null) {
    return null;
  } else {
    try {
      let decryptedData = decryptData(currentData, password);
      let result = JSON.parse(decryptedData);
      return result;
    } catch (error) {
      console.log(error);
    }
  }
  return null;
}

function stringToBytes(str: string) {
  var ch,
    st,
    re: number[] = [];
  for (var i = 0; i < str.length; i++) {
    ch = str.charCodeAt(i); // get char
    st = []; // set up "stack"
    do {
      st.push(ch & 0xff); // push byte to stack
      ch = ch >> 8; // shift value down by 1 byte
    } while (ch);
    // add stack contents to result
    // done because chars have "wrong" endianness
    re = re.concat(st.reverse());
  }
  // return an array of bytes
  return re;
}

function keyBytes(input: string) {
  const key: number[] = stringToBytes(input);
  if (key.length > 32) {
    throw new Error("password too long");
  }
  while (key.length !== 32) {
    key.push(16);
  }
  return key;
}

export function encryptData(input: AccountData, password: string) {
  // An example 128-bit key (16 bytes * 8 bits/byte = 128 bits)
  var key = keyBytes(password);
  const dataToSave = JSON.stringify(input);

  // Convert text to bytes
  var textBytes = aes.utils.utf8.toBytes(dataToSave);

  // The counter is optional, and if omitted will begin at 1
  var aesCtr = new aes.ModeOfOperation.ctr(key, new aes.Counter(5));
  var encryptedBytes = aesCtr.encrypt(textBytes);

  // To print or store the binary data, you may convert it to hex
  var encryptedHex = aes.utils.hex.fromBytes(encryptedBytes);

  return encryptedHex;
}

export function decryptData(data: string, password: string) {
  var key = keyBytes(password);

  // When ready to decrypt the hex string, convert it back to bytes
  var encryptedBytes = aes.utils.hex.toBytes(data);

  // The counter mode of operation maintains internal state, so to
  // decrypt a new instance must be instantiated.
  var aesCtr = new aes.ModeOfOperation.ctr(key, new aes.Counter(5));
  var decryptedBytes = aesCtr.decrypt(encryptedBytes);

  // Convert our bytes back into text
  var decryptedText = aes.utils.utf8.fromBytes(decryptedBytes);
  return decryptedText;
}
