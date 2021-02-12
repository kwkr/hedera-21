import styled from "@emotion/styled";
import React, { useContext, useEffect, useState } from "react";
//@ts-ignore
import {
  Field,
  Control,
  Label,
  Input,
  //@ts-ignore
} from "react-bulma-components/lib/components/form";
//@ts-ignore
import Progress from "react-bulma-components/lib/components/progress";
import {
  ButtonPrimary,
  Container,
  H1,
  Title,
  TokenDescription,
  TokenTile,
} from "Shared";
import { UserContext } from "./App";
import {
  associateTokenWithSelf,
  createRequestTopic,
  getAccountBalance,
  getTopicMessage,
  postRequestToAuthorTopic,
  userPostDepositConfirm,
  userTransferFunds,
} from "./hedera";

const Paragraph = styled.p``;
const PaddedParagraph = styled.p`
  padding: 6px 0;
`;
const Padding = styled.div`
  padding: 12px 0;
`;
const PaddingLeft = styled.div`
  padding-left: 6px;
`;

const Info = styled(H1)`
  color: red;
`;

type Token = { token_id: string; balance: number };

enum EvenInfo {
  REQUEST_APPROVED = "Token request was approved!.",
}

const EventInfo = styled(H1)`
  color: green;
`;

export function User() {
  const [tokenRequestString, setTokenRequestString] = useState("");
  const [tokenPrice, setTokenPrice] = useState("");
  const [tokenSupply, setTokenSupply] = useState("");
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [isRequestingToken, setIsRequestingToken] = useState(false);
  const [showStatusInfo, setShowStatusInfo] = useState(false);
  const [tokensToBuy, setTokensToBuy] = useState(0);
  const [eventInfo, setEventInfo] = useState("");
  const [timeoutId, setTimeoutId] = useState(-1);
  const [tokens, setTokens] = useState<Token[]>([]);
  const {
    userData,
    hederaClient,
    setBuyingTokenData,
    updateWaitingForConfirmBuyingToken,
  } = useContext(UserContext);

  const [balance, setBalance] = useState(0);

  useEffect(() => {
    async function getBalance() {
      let r = await getAccountBalance(userData.accountId);

      setBalance(r.balance);
      setTokens(r.tokens);
    }
    getBalance();
  }, [setBalance, userData.accountId]);
  return (
    <Container>
      <Title>Welcome in the Fan section!</Title>
      <H1>{`Account ID: ${userData.accountId ?? "unknown"}`}</H1>
      <H1>{`Balance: ${balance / 1e8 ?? "unknown"} Hbar`}</H1>
      <H1>Your tokens :</H1>
      {tokens.map((i) => (
        <PaddingLeft key={i.token_id}>
          <InfoParagraph>{`ID: ${i.token_id} X ${i.balance}`}</InfoParagraph>
        </PaddingLeft>
      ))}
      {eventInfo.length === 0 ? null : <EventInfo>{eventInfo}</EventInfo>}
      <H1>Your token requests:</H1>
      {showStatusInfo ? <Info>The creator didn't respond yet.</Info> : null}
      {userData.buyingTokens.filter((i) => i.waitingForConfirm).length === 0 ? (
        <Paragraph>You don't have any tokens yet.</Paragraph>
      ) : null}
      <TokensWrapper>
        {userData.buyingTokens.map((buyingToken) => {
          if (!buyingToken.waitingForConfirm) {
            return null;
          }
          return (
            <div key={buyingToken.tokenId} style={{ padding: "6px 0" }}>
              <TokenTile>
                <TokenDescription>
                  <InfoParagraph>{`Token name: ${buyingToken.tokenName}`}</InfoParagraph>
                  <InfoParagraph>{`Token symbol: ${buyingToken.tokenSymbol}`}</InfoParagraph>
                  <InfoParagraph>{`Token id: ${buyingToken.tokenId}`}</InfoParagraph>
                </TokenDescription>
                <ButtonPrimary
                  onClick={async () => {
                    const message = await getTopicMessage(
                      buyingToken.buyerTopicId,
                      1
                    );
                    if (message == null) {
                      setShowStatusInfo(true);
                      setTimeout(() => {
                        setShowStatusInfo(false);
                      }, 2000);
                      console.log("nothing to see here");
                      return;
                    }
                    let msg = atob(message.message);
                    const [type, targetAccountId, totalPriceString] = msg.split(
                      ":"
                    );
                    if (type === "OK") {
                      if (timeoutId !== -1) {
                        clearTimeout(timeoutId);
                      }
                      setEventInfo(EvenInfo.REQUEST_APPROVED);
                      let id: any = setTimeout(() => {
                        setEventInfo("");
                      }, 2000);
                      setTimeoutId(id);
                      const totalPrice = parseInt(totalPriceString, 10);
                      const transactionId = await userTransferFunds(
                        userData.accountId,
                        targetAccountId,
                        totalPrice,
                        hederaClient
                      );
                      console.log(
                        "Posting confirm to",
                        buyingToken.authorTopicId
                      );
                      await userPostDepositConfirm(
                        buyingToken.authorTopicId,
                        userData.accountId,
                        transactionId,
                        hederaClient
                      );
                    }
                    updateWaitingForConfirmBuyingToken(buyingToken.tokenId);
                  }}
                >
                  Check status
                </ButtonPrimary>
              </TokenTile>
            </div>
          );
        })}
      </TokensWrapper>
      <Padding>
        <H1>Here you can request a token.</H1>
      </Padding>
      <Field>
        <Label>Get token string</Label>
        <Control>
          <Input
            onChange={(value: any) => {
              const tokenString = value.target.value;
              const [
                _,
                __,
                ___,
                tokenPrice,
                tokenSupply,
                tokenData,
              ] = tokenString.split(":");
              if (tokenPrice === undefined || tokenSupply === undefined) {
                return;
              }
              const [tokenName, tokenSymbol] = atob(tokenData).split("::");
              setTokenName(tokenName);
              setTokenSymbol(tokenSymbol);
              setTokenRequestString(tokenString);
              setTokenPrice(tokenPrice);
              setTokenSupply(tokenSupply);
            }}
            value={tokenRequestString}
            placeholder="Paste here your token code"
          />
        </Control>
      </Field>
      {tokenPrice.length !== 0 && tokenPrice !== "0" ? (
        <PaddedParagraph>{`Token price: ${tokenPrice} Tiny Hbar (Total supply: ${tokenSupply})`}</PaddedParagraph>
      ) : null}

      <Field>
        <Label>How many tokens to request?</Label>
        <Control>
          <Input
            onChange={(value: any) => {
              const v = value.target.value;
              if (v === "") {
                setTokensToBuy(0);
                return;
              }
              const parsed = parseInt(v, 10);
              if (!Number.isNaN(parsed)) {
                setTokensToBuy(parsed);
              }
            }}
            value={tokensToBuy}
            placeholder=""
          />
        </Control>
      </Field>
      {tokenRequestString.length > 0 ? (
        <ButtonPrimary
          disabled={isRequestingToken}
          onClick={async () => {
            setTokenRequestString("");
            setIsRequestingToken(true);
            const [
              tokenId,
              authorTopicId,
              authorCommunicationKey,
              tokenPrice,
            ] = tokenRequestString.split(":");
            const {
              topicId: requestTopicId,
              topicKey,
            } = await createRequestTopic(hederaClient);
            await associateTokenWithSelf(tokenId, hederaClient);
            await postRequestToAuthorTopic(
              tokenId,
              authorTopicId,
              requestTopicId,
              topicKey,
              tokensToBuy,
              userData.privateCommunicationKey,
              userData.publicCommunicationKey,
              authorCommunicationKey,
              hederaClient
            );
            setBuyingTokenData([
              ...userData.buyingTokens,
              {
                tokenId,
                tokenSymbol: tokenSymbol,
                tokenName: tokenName,
                buyerTopicId: requestTopicId,
                authorTopicId,
                waitingForConfirm: true,
                communicationPublicKey: userData.publicCommunicationKey,
              },
            ]);
            setIsRequestingToken(false);
            setTokenPrice("0");
          }}
        >
          {`Request ${tokensToBuy} tokens for ${
            tokensToBuy * parseInt(tokenPrice, 10)
          } Tiny Hbar`}
        </ButtonPrimary>
      ) : null}

      {isRequestingToken ? (
        <div>
          <p>Token request is being sent.</p>
          <Progress color="primary" size="small" />
        </div>
      ) : null}
    </Container>
  );
}

const TokensWrapper = styled.div`
  display: flex;
  flex-direction: column;
`;

const InfoParagraph = styled.p``;
