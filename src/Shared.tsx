import styled from "@emotion/styled";

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  width: 70%;
  padding: 24px;
  margin: auto;
  background-color: white;
  min-height: 100vh;

  @media (max-width: 420px) {
    width: 100%;
  }
`;

export const ButtonPrimary = styled.button`
  font-weight: 400;
  padding: 12px;
  min-width: 100px;
  font-size: 18px;
  background-color: #fae73c;
  border-radius: 4px;
  border-width: 0px;
`;

export const ButtonTile = styled.button`
  font-weight: 700;
  padding: 12px;
  min-width: 150px;
  max-width: 250px;
  min-height: 100px;
  font-size: 18px;
  background-color: #fae73c;
  border-radius: 4px;
  border-width: 0px;
`;

export const ButtonSecondary = styled.button`
  font-weight: 400;
  padding: 12px;
  min-width: 100px;
  font-size: 18px;
  background-color: #dfd89b;
  border-radius: 4px;
  border-width: 0px;
`;

export const ButtonWrapper = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 12px 0;
`;

export const Title = styled.h1`
  font-weight: 700;
  font-size: 28px;
  padding: 12px 0;
`;

export const H1 = styled.h1`
  font-weight: 700;
  font-size: 18px;
  padding: 6px 0;
`;

export const TokenTile = styled.div`
  padding: 8px;
  border: 2px solid #36363620;
  border-radius: 6px;
  display: flex;
  justify-content: space-between;
`;

export const TokenDescription = styled.div``;
