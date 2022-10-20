import React from "react";
import Header from "./components/Header/Header";
import Main from "./pages/Main"
import "./app.css";

const App = () => {
    return (
        <div id="app">
            <Header />
            <Main />
        </div>
    );
};
export default App;
