import React from "react";
import { useWeb3React } from "@web3-react/core";
import Button from "@mui/material/Button";
import { reduceAddress } from "../../utils/common";

const ConnectWalletButton = (props) => {
    const { changeWalletListModalState } = props;
    const { account } = useWeb3React();
    const openWalletListModal = () => {
        changeWalletListModalState(true);
    };
    return (
        <>
            {account ? (
                <Button>{reduceAddress(account)}</Button>
            ) : (
                <Button onClick={openWalletListModal}>Connect Wallet</Button>
            )}
        </>
    );
};

export default ConnectWalletButton;
