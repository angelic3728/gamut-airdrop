import React from "react";
import Dialog from "@mui/material/Dialog";
import List from "@mui/material/List";
import { wallets } from "../../config/constants/wallets";
import WalletListIndex from "./WalletListIndex";
import useStyles from "../../assets/styles";

const ConnectWalletModal = (props) => {
    const classes = useStyles.base();
    const { changeWalletListModalState } = props;
    const closeModal = () => {
        changeWalletListModalState(false);
    };
    return (
        <Dialog
            open
            onClose={closeModal}
            classes={{
                paper: classes.connectWallet,
            }}
            fullWidth={true}
        >
            <h2>Connect Wallet</h2>
            <List className="wallet-list">
                {wallets.map((wallet, index) => (
                    <WalletListIndex
                        key={`walletList-${index}`}
                        wallet={wallet}
                        closeModal={closeModal}
                    />
                ))}
            </List>
        </Dialog>
    );
};

export default ConnectWalletModal;
