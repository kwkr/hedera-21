import styled from "@emotion/styled";
import React, { useContext, useState } from "react";
import {
  Field,
  Control,
  Label,
  Input,
  //@ts-ignore
} from "react-bulma-components/lib/components/form";
//@ts-ignore
import { encryptData, saveData } from "./hasAccount";
import { useHistory } from "react-router-dom";
import { generateKeyPair } from "./keys";
import { UserContext } from "./App";
import { ButtonPrimary, ButtonWrapper, Container, Title } from "Shared";

const KeysInfo = styled.p``;

export function Setup() {
  const [accountId, setAccountId] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [password, setPassword] = useState("");
  const [keyPair, setKeypair] = useState({ public: "", private: "" });
  const { setData } = useContext(UserContext);
  const [showConfirm, setShowConfirm] = useState(false);
  const history = useHistory();
  return (
    <Container>
      <Title>
        {`Fill your account data to be able to manage your account.`}
      </Title>
      <a href={"https://portal.hedera.com/"} rel="noreferrer" target="_blank">
        Don't have a Hedera account yet? Click here
      </a>
      <Field>
        <Label>Account ID</Label>
        <Control>
          <Input
            onChange={(value: any) => {
              setAccountId(value.target.value.trim());
            }}
            value={accountId}
          />
        </Control>
      </Field>

      <Field>
        <Label>Private key</Label>
        <Control>
          <Input
            onChange={(value: any) => {
              setPrivateKey(value.target.value.trim());
            }}
            value={privateKey}
          />
        </Control>
      </Field>

      <Field>
        <Label>Public key</Label>
        <Control>
          <Input
            onChange={(value: any) => {
              setPublicKey(value.target.value.trim());
            }}
            value={publicKey}
          />
        </Control>
      </Field>
      <Field>
        <Label>Password</Label>
        <Control>
          <Input
            onChange={(value: any) => {
              setPassword(value.target.value.trim());
            }}
            value={password}
            type={"password"}
          />
        </Control>
      </Field>
      <div>
        {showConfirm ? null : (
          <ButtonWrapper>
            <ButtonPrimary
              onClick={async () => {
                let communicationKeys = await generateKeyPair();
                setKeypair(communicationKeys);
                setShowConfirm(true);
              }}
            >
              Save
            </ButtonPrimary>
          </ButtonWrapper>
        )}
        {showConfirm ? (
          <>
            <KeysInfo>
              A communication key pair was generated for you. It will be used to
              facilitate safe communication between you and other users.
            </KeysInfo>
            <KeysInfo>
              {`Public key: `}
              <b>{keyPair.public}</b>
            </KeysInfo>
            <ButtonWrapper>
              <ButtonPrimary
                onClick={() => {
                  let setupData = {
                    accountId,
                    privateKey,
                    publicKey,
                    privateCommunicationKey: keyPair.private,
                    publicCommunicationKey: keyPair.public,
                    buyingTokens: [],
                    sellingTokens: [],
                  };
                  let result = encryptData(setupData, password);
                  saveData(result);
                  setData(setupData);
                  history.push("/");
                }}
              >
                Confirm
              </ButtonPrimary>
            </ButtonWrapper>
          </>
        ) : null}
      </div>
    </Container>
  );
}
