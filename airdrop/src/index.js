import React from "react";
import ReactDOM from "react-dom";

// ** Import Providers
import MaterialThemeProvider from "./providers/theme";
import MuiSnackbarProvider from "./providers/snackbar";
import NotificationProvider from "./providers/notification";
import Web3Provider from "./providers/web3";

import {Provider as ReduxProvider} from "react-redux";

// ** Initialize Store
import configureStore from "./redux/store";

// ** Import App
import App from "./App";

import {QueryClientProvider, QueryClient} from "react-query";
const client = new QueryClient();
const store = configureStore();
ReactDOM.render (
    <QueryClientProvider client={client}>
        <ReduxProvider store={store}>
            <MaterialThemeProvider>
                <MuiSnackbarProvider>
                    <NotificationProvider>
                        <Web3Provider>
                            <App/>
                        </Web3Provider>
                    </NotificationProvider>
                </MuiSnackbarProvider>
            </MaterialThemeProvider>
        </ReduxProvider>
    </QueryClientProvider>,
    document.getElementById("app-root")
);
