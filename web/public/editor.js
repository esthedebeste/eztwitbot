/** @type {DocumentFragment} */
const grammarTemplate = document.querySelector("template#part").content;
/** @type {HTMLInputElement} */
const optionTemplate =
  document.querySelector("template#option").content.firstChild;

function addToForm(form, key = "", options = [""]) {
  /** @type {DocumentFragment} */
  const part = grammarTemplate.cloneNode(true);
  const partname = part.querySelector("input.partname");
  partname.value = key;
  if (key === "main") {
    partname.toggleAttribute("readonly", true);
    partname.toggleAttribute("disabled", true);
  }
  const optionsEl = part.querySelector("span.options");
  part
    .querySelector("button.addoption")
    .addEventListener("click", function (event) {
      const newOption = optionTemplate.cloneNode(true);
      newOption.value = "";
      optionsEl.appendChild(newOption);
      this.parentElement
        .querySelector("button.removeoption")
        .toggleAttribute("hidden", false);
    });
  part
    .querySelector("button.removeoption")
    .addEventListener("click", function (event) {
      if (optionsEl.children.length > 1) {
        if (optionsEl.children.length == 2)
          this.toggleAttribute("hidden", true);
        optionsEl.lastElementChild.remove();
      } else this.parentElement.remove();
    });
  if (options.length === 1)
    part.querySelector("button.removeoption").toggleAttribute("hidden", true);
  for (const option of options) {
    const newOption = optionTemplate.cloneNode(true);
    newOption.value = option;
    optionsEl.appendChild(newOption);
  }

  form.appendChild(part);
  return part;
}

/**
 * Generate EZTwitBot Form
 * @param {HTMLElement} parent
 * @param {Object} grammar
 */
function generateForm(parent, grammar) {
  for (const key in grammar) addToForm(parent, key, grammar[key]);
}
/**
 * Extract Grammar from EZTwitBot Form
 * @param {HTMLElement} form
 * @returns {{[x: string]: String[] | String}} Grammar
 */
function extractForm(form) {
  const result = {};
  for (const part of form.children) {
    const key = part.querySelector("input.partname").value;
    const value = Array.from(part.querySelector("span.options").children).map(
      option => option.value
    );
    result[key] = value;
  }
  return result;
}

// Starting Form
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

// Initialize examples

for (const example of document.getElementsByClassName("example")) {
  const dataset = { ...example.dataset };
  for (const datapoint in dataset)
    dataset[datapoint] = dataset[datapoint].split(",");
  console.log(dataset);
  generateForm(example, dataset);
  for (const input of example.querySelectorAll("input"))
    input.toggleAttribute("readonly", true);
  for (const button of example.querySelectorAll("button"))
    button.toggleAttribute("disabled", true);
}
