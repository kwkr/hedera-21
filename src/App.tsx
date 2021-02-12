import React, { createContext, useState } from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
} from "react-router-dom";
import { Setup } from "./Setup";
import { Account } from "./Account";
import { Author } from "./Author";
import { User } from "./User";
import { useHedera } from "./hedera";
import { encryptData, saveData } from "./hasAccount";

import "./App.scss";

export type AccountData = {
  accountId: string;
  privateKey: string;
  publicKey: string;
  privateCommunicationKey: string;
  publicCommunicationKey: string;
  sellingTokens: SellingToken[];
  buyingTokens: BuyingToken[];
};

export type SellingToken = {
  price: number;
  tokenName: string;
  tokenSymbol: string;
  tokenId: string;
  topicId: string;
  communicationPublicKey: string;
  lastProcessedItem: number;
};

export type BuyingToken = {
  tokenName: string;
  tokenSymbol: string;
  tokenId: string;
  buyerTopicId: string;
  authorTopicId: string;
  communicationPublicKey: string;
  waitingForConfirm: boolean;
};

const defaultUserData: AccountData = {
  accountId: "",
  privateKey: "",
  publicKey: "",
  privateCommunicationKey: "",
  publicCommunicationKey: "",
  buyingTokens: [],
  sellingTokens: [],
};

export const UserContext = createContext({
  userData: defaultUserData,
  hederaClient: {},
  setData: (data: AccountData) => {},
  setSellingTokensData: (data: SellingToken[]) => {},
  setBuyingTokenData: (data: BuyingToken[]) => {},
  updateLastProcessedSellingToken: (
    tokenId: string,
    lastProcessedItem: number
  ) => {},
  updateWaitingForConfirmBuyingToken: (tokenId: string) => {},
  currentPassowrd: "",
  setCurrentPassword: (password: string) => {},
});

function App() {
  const [currentUserData, setUserData] = useState(defaultUserData);
  const [currentPassowrd, setCurrentPassword] = useState("");
  const { setup, isSetup, client } = useHedera();

  function overwriteData(data: AccountData) {
    if (!isSetup) {
      setup(data.accountId, data.privateKey);
    }
    if (currentPassowrd.length > 0) {
      let result = encryptData(data, currentPassowrd);
      saveData(result);
    }
    setUserData(data);
  }
  return (
    <UserContext.Provider
      value={{
        userData: currentUserData,
        hederaClient: client,
        updateLastProcessedSellingToken: (tokenId, lastProcessedItem) => {
          let newState: AccountData = JSON.parse(
            JSON.stringify(currentUserData)
          );
          for (const token of newState.sellingTokens) {
            if (token.tokenId === tokenId) {
              token.lastProcessedItem = lastProcessedItem;
              break;
            }
          }
          overwriteData(newState);
        },
        updateWaitingForConfirmBuyingToken: (tokenId) => {
          let newState: AccountData = JSON.parse(
            JSON.stringify(currentUserData)
          );
          for (const token of newState.buyingTokens) {
            if (token.tokenId === tokenId) {
              token.waitingForConfirm = false;
              break;
            }
          }
          overwriteData(newState);
        },
        setSellingTokensData: (data) => {
          let newState: AccountData = JSON.parse(
            JSON.stringify(currentUserData)
          );
          newState.sellingTokens = data;
          overwriteData(newState);
        },
        setBuyingTokenData: (data) => {
          let newState: AccountData = JSON.parse(
            JSON.stringify(currentUserData)
          );
          newState.buyingTokens = data;
          overwriteData(newState);
        },
        currentPassowrd,
        setCurrentPassword,
        setData: overwriteData,
      }}
    >
      <Router>
        {currentUserData.accountId.length === 0 ? <Redirect to={"/"} /> : null}
        <Switch>
          <Route path="/setup">
            <Setup />
          </Route>
          <Route path="/author">
            <Author />
          </Route>
          <Route path="/user">
            <User />
          </Route>
          <Route path="/">
            <Account />
          </Route>
        </Switch>
      </Router>
    </UserContext.Provider>
  );
}

export default App;
