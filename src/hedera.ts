import * as h from "@hashgraph/sdk";
import { useState } from "react";
import nacl from "tweetnacl";
import naclutil from "tweetnacl-util";
import { fromHexString, toHexString } from "./keys";
import axios from "axios";

export async function createToken(
  tokenName: string,
  tokenSymbol: string,
  supply: number,
  client: any
) {
  //creates an immutable token
  const txResponse = await new h.TokenCreateTransaction()
    .setTokenName(tokenName)
    .setTokenSymbol(tokenSymbol)
    .setTreasuryAccountId(client.operatorAccountId)
    .setInitialSupply(supply)
    .execute(client);
  const receipt = await txResponse.getReceipt(client);
  const tokenId = receipt.tokenId;

  console.log("The new token ID is " + tokenId);

  const topicTransaction = new h.TopicCreateTransaction();
  const topicTxResponse = await topicTransaction.execute(client);
  const topicReceipt = await topicTxResponse.getReceipt(client);
  const newTopicId = topicReceipt.topicId;

  console.log("The new topic ID is " + newTopicId);
  if (newTopicId === null || tokenId === null) {
    throw new Error("Error while creating token.");
  }

  return { topicId: newTopicId.toString(), tokenId: tokenId.toString() };
}

export async function createRequestTopic(client: any) {
  //Create the transaction
  const privateKey = await h.PrivateKey.generate();
  const transaction = new h.TopicCreateTransaction().setSubmitKey(privateKey);

  //Sign with the client operator private key and submit the transaction to a Hedera network
  const txResponse = await transaction.execute(client);

  //Request the receipt of the transaction
  const receipt = await txResponse.getReceipt(client);

  //Get the topic ID
  const newTopicId = receipt.topicId;

  console.log("The new topic ID is " + newTopicId);

  if (newTopicId === null) {
    throw new Error("Error while creating a topic.");
  }
  return {
    topicId: newTopicId.toString(),
    topicKey: toHexString(privateKey.toBytes()),
  };
}

export async function postRequestToAuthorTopic(
  tokenId: string,
  authorTopicId: string,
  responseTopicId: string,
  topicKey: string,
  amount: number,
  encryptPrivateKey: string,
  encryptPublicKey: string,
  recipientPublicKey: string,
  client: any
) {
  const sharedKey = nacl.box.before(
    fromHexString(recipientPublicKey),
    fromHexString(encryptPrivateKey)
  );

  const nonce = nacl.randomBytes(24);
  const message = `${tokenId}:${responseTopicId}:${topicKey}:${amount}`;

  const box = nacl.box.after(naclutil.decodeUTF8(message), nonce, sharedKey);

  await new h.TopicMessageSubmitTransaction({
    topicId: h.TopicId.fromString(authorTopicId),
    message: `TOKEN_REQUEST:${encryptPublicKey}:${toHexString(
      box
    )}:${toHexString(nonce)}`,
    maxChunks: undefined,
  }).execute(client);
}

export async function authorDecryptMessage(
  msgContent: string,
  authorPrivateCommunicationKey: string
) {
  const [type, publicKey, msg, nonce] = msgContent.split(":");

  const msgBytes = fromHexString(msg);
  const nonceBytes = fromHexString(nonce);

  const decodeKey = nacl.box.before(
    fromHexString(publicKey),
    fromHexString(authorPrivateCommunicationKey)
  );

  const payload = nacl.box.open.after(msgBytes, nonceBytes, decodeKey);
  if (payload === null) {
    throw new Error("Message decryption failed!");
  }

  const [tokenId, responseTopicId, topicKey, amount] = naclutil
    .encodeUTF8(payload)
    .split(":");
  return {
    tokenId,
    responseTopicId,
    topicKey,
    amount,
  };
}

export async function getAccountBalance(accountId: string) {
  try {
    const response = await axios.get(
      `https://testnet.mirrornode.hedera.com/api/v1/balances?account.id=${accountId}`
    );
    const balance = response.data.balances[0];
    return { ...balance };
  } catch (error) {
    console.log(error);
    if (error.response) {
      if (error.response.status === 404) {
        return { links: 0, messages: [] };
      }
    }
  }
  return { balance: 0, tokens: [] };
}

export async function getTokenInfo(tokenId: string) {
  try {
    const response = await axios.get(
      `https://testnet.mirrornode.hedera.com/api/v1/tokens/${tokenId}`
    );
    const tokenInfo = response.data;
    return { ...tokenInfo };
  } catch (error) {
    console.log(error);
    if (error.response) {
      if (error.response.status === 404) {
        return { links: 0, messages: [] };
      }
    }
  }
  return { name: "unknown" };
}

export async function getTopicMessages(
  topicId: string,
  sequenceNumber?: number
): Promise<{
  links: any;
  messages: {
    consensus_timestamp: string;
    message: string;
    sequence_number: number;
  }[];
}> {
  try {
    const response = await axios.get(
      `https://testnet.mirrornode.hedera.com/api/v1/topics/${topicId}/messages/${
        sequenceNumber ?? ""
      }`
    );
    return response.data;
  } catch (error) {
    console.log(error);
    if (error.response) {
      if (error.response.status === 404) {
        return { links: 0, messages: [] };
      }
    }
  }
  return { links: -1, messages: [] };
}

export async function getTopicMessage(
  topicId: string,
  sequenceNumber: number
): Promise<{
  consensus_timestamp: string;
  message: string;
  sequence_number: number;
} | null> {
  try {
    const url = `https://testnet.mirrornode.hedera.com/api/v1/topics/${topicId}/messages/${sequenceNumber}`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.log(error);
    if (error.response) {
      if (error.response.status === 404) {
        return null;
      }
    }
  }
  return null;
}

export async function userTransferFunds(
  sourceAccontId: string,
  targetAccountId: string,
  amount: number,
  client: any
) {
  const transferTransactionResponse = await new h.TransferTransaction()
    .addHbarTransfer(sourceAccontId, h.Hbar.fromTinybars(-amount)) //Sending account
    .addHbarTransfer(targetAccountId, h.Hbar.fromTinybars(amount)) //Receiving account
    .execute(client);
  const rawTransactionId = transferTransactionResponse.transactionId.toString();
  const [id, timestamp] = rawTransactionId.split("@");
  const [ss, nn] = timestamp.split(".");
  return `${id}-${ss}-${nn}`;
}

export async function getTransaction(transactionId: string) {
  try {
    const response = await axios.get(
      `https://testnet.mirrornode.hedera.com/api/v1/transactions/${transactionId}`
    );
    const data = response.data;
    const [tx] = data.transactions;
    return tx;
  } catch (error) {
    console.log(error);
    if (error.response) {
      if (error.response.status === 404) {
        return null;
      }
    }
  }
  return null;
}

export async function authorPostRequestConfirm(
  topicKey: string,
  topicId: string,
  targetAccountId: string,
  totalPrice: number,
  client: any
) {
  const t = new h.TopicMessageSubmitTransaction({
    topicId: h.TopicId.fromString(topicId),
    message: `OK:${targetAccountId}:${totalPrice}`,
    maxChunks: undefined,
  });

  t.freezeWith(client);
  await t.sign(h.PrivateKey.fromString(topicKey));
  let result = await t.execute(client);
  const receipt = await result.getReceipt(client);
}

export async function userPostDepositConfirm(
  topicId: string,
  targetAccountId: string,
  transactionId: string,
  client: any
) {
  const t = new h.TopicMessageSubmitTransaction({
    topicId: h.TopicId.fromString(topicId),
    message: `DEPOSIT_CONFIRM:${targetAccountId}:${transactionId}`,
    maxChunks: undefined,
  });

  let result = await t.execute(client);
  const receipt = await result.getReceipt(client);
  console.log(receipt);
}

export async function associateTokenWithSelf(tokenId: string, client: any) {
  try {
    //Associate a token to an account and freeze the unsigned transaction for signing
    const txResponse = await new h.TokenAssociateTransaction()
      .setAccountId(client.operatorAccountId)
      .setTokenIds([tokenId])
      .execute(client);
    const receipt = await txResponse.getReceipt(client);
    const transactionStatus = receipt.status;
    console.log(
      "The transaction consensus status " + transactionStatus.toString()
    );
  } catch (error) {
    console.log(error);
    if (error.name !== "StatusError") {
      throw new Error("Sth strange happened...");
    }
  }
}

export async function transferToken(
  tokenId: string,
  targetAccountId: string,
  amount: number,
  client: any
) {
  const txResponse = await new h.TransferTransaction()
    .addTokenTransfer(tokenId, client.operatorAccountId, -amount)
    .addTokenTransfer(tokenId, targetAccountId, amount)
    .execute(client);
  const receipt = await txResponse.getReceipt(client);
  const transactionStatus = receipt.status;
  console.log(
    "The transaction consensus status " + transactionStatus.toString()
  );
}

export async function authorTransferToken(
  targetAccountId: string,
  client: any
) {
  const transferTransactionResponse = await new h.TransferTransaction()
    .addHbarTransfer(client.operatorAccountId, h.Hbar.fromTinybars(-10)) //Sending account
    .addHbarTransfer(targetAccountId, h.Hbar.fromTinybars(10)) //Receiving account
    .execute(client);
}

export function useHedera() {
  const [currentClient, setClient] = useState<any | null>(null);

  async function queryAccountInfo() {
    if (currentClient === null) {
      return;
    }
    await currentClient.setMaxQueryPayment(
      h.Hbar.from(-2000, h.HbarUnit.Tinybar)
    );
    const query = new h.AccountInfoQuery().setAccountId(
      currentClient.operatorAccountId
    );
    const accountInfo = await query.execute(currentClient);
  }

  async function queryBalance() {
    if (currentClient === null) {
      return;
    }
    //Create the account balance query
    await currentClient.setMaxQueryPayment(new h.Hbar(2));
    await currentClient.setMaxTransactionFee(new h.Hbar(2));
    const query = new h.AccountBalanceQuery().setAccountId(
      currentClient.operatorAccountId
    );
    //Submit the query to a Hedera network
    const accountBalance = await query.execute(currentClient);

    //Print the balance of hbars
    console.log(
      "The hbar account balance for this account is " + accountBalance.hbars
    );
  }

  function setup(accountId: string, privateKey: string) {
    const client = h.Client.forTestnet();
    client.setOperator(accountId, privateKey);
    setClient(client);
  }
  return {
    setup,
    isSetup: currentClient !== null,
    client: currentClient,
    queryBalance,
    queryAccountInfo,
    createToken,
  };
}
