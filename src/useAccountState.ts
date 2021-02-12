import { useEffect, useState } from "react";
import { getData, hasDataSaved } from "./hasAccount";

type AccountData = {
  accountId: string;
  privateKey: string;
  publicKey: string;
};

export function useAccountState() {
  const [state, setState] = useState<AccountData | null>(null);
  const [isDataSaved, setIsDataSaved] = useState(false);
  useEffect(() => {
    const dataSaved = hasDataSaved();
    setIsDataSaved(dataSaved);
  }, [setIsDataSaved]);

  function logIn(password: string) {
    const data = getData(password);
    setIsDataSaved(true);
    setState(data);
  }

  function updateState(data: AccountData) {
    setState(data);
    setIsDataSaved(true);
  }

  return { logIn, state, isDataSaved, updateState };
}
