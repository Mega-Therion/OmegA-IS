import "./style.css";
import { App } from "./App";

const root = document.getElementById("app");
if (root) {
  root.innerHTML = App();
}
