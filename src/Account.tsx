import styled from "@emotion/styled";
import React, { useContext, useState } from "react";
import {
  Field,
  Control,
  Input,
  //@ts-ignore
} from "react-bulma-components/lib/components/form";
import { Link, useHistory } from "react-router-dom";
import {
  ButtonPrimary,
  ButtonSecondary,
  ButtonTile,
  ButtonWrapper,
  Container,
  H1,
  Title,
} from "Shared";
import { UserContext } from "./App";
import { getData } from "./hasAccount";
import { useAccountState } from "./useAccountState";

const InputWrapper = styled.div`
  display: flex;
  padding: 12px 0;
`;

const MenuWrapper = styled.div`
  display: flex;
  justify-content: space-around;
  align-items: center;
`;

const Padding = styled.div`
  padding: 12px 0;
`;

const Label = styled.h1`
  font-weight: 700;
  font-size: 14px;
`;

const InfoError = styled.p`
  color: red;
`;

const Image = styled.img`
  max-width: 200px;
`;

export function Account() {
  const { isDataSaved } = useAccountState();
  const [password, setPassword] = useState("");
  const [showPasswordInvalidError, setShowPasswordInvalidError] = useState(
    false
  );
  const { userData, setData, setCurrentPassword } = useContext(UserContext);

  function isUserData() {
    return userData.accountId.length > 0;
  }
  const history = useHistory();
  return (
    <Container>
      <Title>{"Welcome to Supi!"}</Title>
      <Image src={"./logo192.png"} />
      {isDataSaved && !isUserData() ? (
        <>
          <H1>
            {
              "Looks like someone was already here. Type your password if that's you."
            }
          </H1>
          <H1>{"If not, clear the data using the button below."}</H1>
          <Padding>
            <Label>Enter password</Label>
          </Padding>
          <InputWrapper>
            <Input
              style={{ width: "none" }}
              onChange={(value: any) => {
                setPassword(value.target.value);
              }}
              onFocus={() => {
                setShowPasswordInvalidError(false);
              }}
              value={password}
              type={"password"}
              placeholder="Password"
            />
          </InputWrapper>
          <ButtonWrapper>
            <ButtonPrimary
              color="primary"
              onClick={() => {
                const data = getData(password);
                if (data === null) {
                  setShowPasswordInvalidError(true);
                  return;
                }
                setData(data);
                setCurrentPassword(password);
              }}
            >
              Confirm
            </ButtonPrimary>
          </ButtonWrapper>
          {showPasswordInvalidError ? (
            <InfoError>{"Password is incorrect!"}</InfoError>
          ) : null}
          <ButtonWrapper>
            <ButtonSecondary
              color={"primary"}
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
            >
              Clear data
            </ButtonSecondary>
          </ButtonWrapper>
        </>
      ) : isUserData() ? (
        <>
          <H1>{" Logged in "}</H1>
          <H1>{" Please choose what would you like to do "}</H1>
          <MenuWrapper>
            <ButtonTile
              onClick={async () => {
                history.push("/user");
              }}
            >
              I am a fan and want to support my favourite creator.
            </ButtonTile>

            <ButtonTile
              onClick={async () => {
                history.push("/author");
              }}
            >
              I am creator and want to create my token.
            </ButtonTile>
          </MenuWrapper>
        </>
      ) : (
        <H1>
          {"No account is setup yet. Please setup one "}
          <Link to={"/setup"}>here</Link>
        </H1>
      )}
    </Container>
  );
}
