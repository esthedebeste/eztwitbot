import { addToForm, extractForm, generateForm } from "./form.js";
import { generate } from "./generator.js";

const botid = document.body.dataset.botid;
const grammar = JSON.parse(decodeURI(document.body.dataset.grammar)) ?? {
  main: ["<hello>! This is a newly created EZTwitBot!"],
  hello: ["Hello World", "Hi", "Heya"],
};
const form = document.querySelector("form#editor");
const saveresult = document.getElementById("saveresult");
generateForm(form, grammar);
document
  .getElementById("addpart")
  .addEventListener("click", () => addToForm(form));

const previewresult = document.getElementById("previewresult");
document.getElementById("preview").addEventListener("click", () => {
  const extract = extractForm(form);
  previewresult.innerText = generate(extract.main, extract);
});

document.getElementById("savegrammar").addEventListener("click", async () => {
  const grammar = extractForm(form);
  try {
    const result = await fetch(`/api/grammar/${botid}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(grammar),
    });
    if (result.status === 200) saveresult.style.color = "#0f0";
    else saveresult.style.color = "#f00";
    const text = await result.text();
    if (result.headers.get("Content-Type") === "text/html")
      saveresult.innerHTML = text;
    else saveresult.innerText = text;
  } catch (e) {
    console.error("Error while putting: ", e);
  }
});
