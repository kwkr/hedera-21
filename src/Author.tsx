import styled from "@emotion/styled";
import React, { useContext, useEffect, useState } from "react";
//@ts-ignore
import { Button, Heading } from "react-bulma-components";
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
  authorDecryptMessage,
  authorPostRequestConfirm,
  createToken,
  getAccountBalance,
  getTopicMessage,
  getTransaction,
  transferToken,
} from "./hedera";
import { UserContext } from "./App";
import QRCode from "qrcode";
import {
  ButtonPrimary,
  ButtonSecondary,
  ButtonWrapper,
  Container,
  H1,
  Title,
  TokenDescription,
  TokenTile,
} from "Shared";

enum EvenInfo {
  TOKEN_REQUEST = "Token request event received.",
  DEPOSIT_RECEIVED = "Transfer received.",
}

export function Author() {
  const {
    userData,
    hederaClient,
    setSellingTokensData: setTokensData,
    updateLastProcessedSellingToken,
  } = useContext(UserContext);
  const [isProcessingRequests, setIsProcessingRequests] = useState(false);
  const [showTokenForm, setShowTokenForm] = useState(false);
  const [isCreatingToken, setIsCreatingToken] = useState(false);
  const [eventInfo, setEventInfo] = useState("");
  const [timeoutId, setTimeoutId] = useState(-1);
  const [newTokenInfo, setNewTokenInfo] = useState({
    tokenId: "",
    topicId: "",
    communicationPublicKey: "",
    tokenName: "",
    tokenSymbol: "",
  });

  const [balance, setBalance] = useState(0);

  useEffect(() => {
    async function getBalance() {
      let r = await getAccountBalance(userData.accountId);

      setBalance(r.balance);
    }
    getBalance();
  }, [setBalance, userData.accountId]);

  function showTokenInfo() {
    return newTokenInfo.tokenId.length > 0;
  }

  function createQrCode(data: string) {
    return new Promise<void>((r, rej) => {
      QRCode.toCanvas(
        document.getElementById("canvas"),
        data,
        function (error) {
          if (error) {
            console.error(error);
            rej();
          }
          r();
        }
      );
    });
  }
  return (
    <Container>
      <Title>Welcome in the Creator section!</Title>
      <Wrapper>
        <H1>{`Account ID: ${userData.accountId ?? "unknown"}`}</H1>
        <H1>{`Balance: ${balance / 1e8 ?? "unknown"} Hbar`}</H1>
        <H1>Your tokens:</H1>
        {userData.sellingTokens.length === 0 ? (
          <InfoParagraph>{`You didn't create any tokens yet.`}</InfoParagraph>
        ) : null}
        {isProcessingRequests ? (
          <div>
            <InfoParagraph>{`Processing requests`}</InfoParagraph>
            <Progress color="primary" size="small" />
          </div>
        ) : null}
        {eventInfo.length === 0 ? null : <EventInfo>{eventInfo}</EventInfo>}
        <TokensWrapper>
          {userData.sellingTokens.map((sellingToken) => (
            <div key={sellingToken.tokenId} style={{ padding: "6px 0" }}>
              <TokenTile>
                <TokenDescription>
                  <InfoParagraph>{`Token name: ${sellingToken.tokenName}`}</InfoParagraph>
                  <InfoParagraph>{`Token symbol: ${sellingToken.tokenSymbol}`}</InfoParagraph>
                  <InfoParagraph>{`Token id: ${sellingToken.tokenId}`}</InfoParagraph>
                </TokenDescription>
                <ButtonSecondary
                  disabled={isProcessingRequests}
                  onClick={async () => {
                    setIsProcessingRequests(true);
                    let messageIndex = sellingToken.lastProcessedItem + 1;
                    while (true) {
                      const message = await getTopicMessage(
                        sellingToken.topicId,
                        messageIndex
                      );
                      if (message == null) {
                        updateLastProcessedSellingToken(
                          sellingToken.tokenId,
                          messageIndex - 1
                        );
                        break;
                      }
                      let content = message.message;
                      content = atob(content);
                      const [msgType] = content.split(":");
                      if (msgType === "DEPOSIT_CONFIRM") {
                        if (timeoutId !== -1) {
                          clearTimeout(timeoutId);
                        }
                        setEventInfo(EvenInfo.DEPOSIT_RECEIVED);
                        let id: any = setTimeout(() => {
                          setEventInfo("");
                        }, 2000);
                        setTimeoutId(id);
                        const [_, accountId, transactionId] = content.split(
                          ":"
                        );

                        let result = await getTransaction(transactionId);
                        if (result.result !== "SUCCESS") {
                          throw new Error("Transaction is not finished.");
                        }
                        const transfers = result.transfers;
                        let isTransfered = false;
                        let isCredited = false;
                        let amount = 0;
                        for (let transfer of transfers) {
                          if (transfer.account === userData.accountId) {
                            if (transfer.amount > 0) {
                              isCredited = true;
                              amount = transfer.amount;
                            }
                          }
                          if (transfer.account === accountId) {
                            if (transfer.amount < 0) {
                              isTransfered = true;
                            }
                          }
                        }
                        const shouldSendToken = isTransfered && isCredited;
                        if (shouldSendToken) {
                          await transferToken(
                            sellingToken.tokenId,
                            accountId,
                            amount / sellingToken.price,
                            hederaClient
                          );
                        }
                      } else if (msgType === "TOKEN_REQUEST") {
                        if (timeoutId !== -1) {
                          clearTimeout(timeoutId);
                        }
                        setEventInfo(EvenInfo.TOKEN_REQUEST);
                        let id: any = setTimeout(() => {
                          setEventInfo("");
                        }, 2000);
                        setTimeoutId(id);
                        const r = await authorDecryptMessage(
                          content,
                          userData.privateCommunicationKey
                        );
                        const tokensAmount = parseInt(r.amount, 10);
                        // here can be decided if the current supply allows to accept a request
                        await authorPostRequestConfirm(
                          r.topicKey,
                          r.responseTopicId,
                          userData.accountId,
                          tokensAmount * sellingToken.price,
                          hederaClient
                        );
                      }
                      messageIndex++;
                    }
                    setIsProcessingRequests(false);
                  }}
                >
                  Process requests
                </ButtonSecondary>
              </TokenTile>
            </div>
          ))}
        </TokensWrapper>
      </Wrapper>
      {!showTokenForm ? (
        <ButtonWrapper>
          <ButtonPrimary
            onClick={() => {
              setShowTokenForm(!showTokenForm);
            }}
          >
            Create token
          </ButtonPrimary>
        </ButtonWrapper>
      ) : null}
      {showTokenForm ? (
        <TokenForm
          isDisabled={isCreatingToken}
          onSubmit={async (tokenName, tokenSymbol, tokenSupply, tokenPrice) => {
            setIsCreatingToken(true);
            const { tokenId, topicId } = await createToken(
              tokenName,
              tokenSymbol,
              tokenSupply,
              hederaClient
            );

            const newTokenInfo = {
              tokenId,
              tokenName,
              tokenSymbol,
              topicId,
              communicationPublicKey: userData.publicCommunicationKey,
              lastProcessedItem: 0,
              price: tokenPrice,
            };
            setTokensData([...userData.sellingTokens, newTokenInfo]);
            setNewTokenInfo(newTokenInfo);
            setIsCreatingToken(false);
            setShowTokenForm(false);
            const tokenData = btoa(`${tokenName}::${tokenSymbol}`);
            const tokenInfo = `${tokenId}:${topicId}:${userData.publicCommunicationKey}:${tokenPrice}:${tokenSupply}:${tokenData}`;
            await createQrCode(tokenInfo);
          }}
        />
      ) : null}
      {isCreatingToken ? <Progress color="primary" size="small" /> : null}
      {showTokenInfo() ? (
        <>
          <H1>{`${newTokenInfo.tokenName} token was created!`}</H1>
          <QrCodeInfo>Share your token with your fans easily</QrCodeInfo>
          <QrCodeInfo>{`${newTokenInfo.tokenName} (${newTokenInfo.tokenSymbol}) id: ${newTokenInfo.tokenId}`}</QrCodeInfo>
          <QrCodeInfo>{`Requests topic: ${newTokenInfo.topicId}`}</QrCodeInfo>
          <QrCodeInfo>{`Your communication key: ${newTokenInfo.communicationPublicKey}`}</QrCodeInfo>
          <QrCodeInfo>{`Click the QR code to download it as a PNG`}</QrCodeInfo>
          <canvas
            onClick={() => {
              let canvas: any = document.getElementById("canvas");
              var image = canvas
                .toDataURL("image/png")
                .replace("image/png", "image/octet-stream");
              window.location.href = image;
            }}
            id="canvas"
          ></canvas>
        </>
      ) : null}
    </Container>
  );
}

const TokensWrapper = styled.div`
  display: flex;
  flex-direction: column;
`;

const EventInfo = styled(H1)`
  color: green;
`;

const InfoParagraph = styled.p``;

const Wrapper = styled.div`
  padding: 12px 0;
`;

const FormWrapper = styled.div`
  display: div;
  flex-direction: column;
  width: 50%;
  padding: 12px 0;
`;

const QrCodeInfo = styled.p`
  font-size: 18px;
`;

function TokenForm({
  isDisabled,
  onSubmit,
}: {
  isDisabled: boolean;
  onSubmit: (
    tokenName: string,
    tokenSymbol: string,
    supply: number,
    price: number
  ) => void;
}) {
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenPrice, setTokenPrice] = useState(0);
  const [tokenSupply, setTokenSupply] = useState(1000);
  return (
    <FormWrapper>
      <Field>
        <Label>Enter Token name</Label>
        <Control>
          <Input
            onChange={(value: any) => {
              setTokenName(value.target.value);
            }}
            value={tokenName}
          />
        </Control>
      </Field>
      <Field>
        <Label>Token Ticker</Label>
        <Control>
          <Input
            onChange={(value: any) => {
              setTokenSymbol(value.target.value);
            }}
            value={tokenSymbol}
          />
        </Control>
      </Field>
      <Field>
        <Label>Token price (Tiny Hbar)</Label>
        <Control>
          <Input
            onChange={(value: any) => {
              const v = value.target.value;
              if (v === "") {
                setTokenPrice(0);
                return;
              }
              const parsed = parseInt(v, 10);
              if (!Number.isNaN(parsed)) {
                setTokenPrice(parsed);
              }
            }}
            value={tokenPrice}
          />
        </Control>
      </Field>

      <Field>
        <Label>Token Supply</Label>
        <Control>
          <Input
            onChange={(value: any) => {
              const v = value.target.value;
              if (v === "") {
                setTokenSupply(0);
                return;
              }
              const parsed = parseInt(v, 10);
              if (!Number.isNaN(parsed)) {
                setTokenSupply(parsed);
              }
            }}
            value={tokenSupply}
          />
        </Control>
      </Field>
      <ButtonPrimary
        disabled={isDisabled}
        onClick={() => {
          onSubmit(tokenName, tokenSymbol, tokenSupply, tokenPrice);
        }}
      >
        Confirm
      </ButtonPrimary>
    </FormWrapper>
  );
}
