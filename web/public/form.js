/*
fieldset.part {
  label[Part name: ]{
    br
    input.partname(type=text placeholder="Part Name")
  }
  label.optslabel[Options: ]{
    span.options
  }
  button.addoption(type=button title="Add another option")[+]
  button.removeoption(type=button title="Remove last option")[-]
}
*/
const grammarTemplate = (() => {
  const ret = document.createElement("fieldset");
  ret.classList.add("part");
  {
    const partnamelabel = document.createElement("label");
    partnamelabel.innerText = "Part name: ";
    partnamelabel.appendChild(document.createElement("br"));
    {
      const partname = document.createElement("input");
      partname.classList.add("partname");
      partname.type = "text";
      partname.placeholder = "Part Name";
      partnamelabel.appendChild(partname);
    }
    ret.appendChild(partnamelabel);
  }
  {
    const optslabel = document.createElement("label");
    optslabel.classList.add("optslabel");
    optslabel.innerText = "Options: ";
    {
      const optsspan = document.createElement("span");
      optsspan.classList.add("options");
      optslabel.appendChild(optsspan);
    }
    ret.appendChild(optslabel);
  }
  {
    const addoption = document.createElement("button");
    addoption.classList.add("addoption");
    addoption.type = "button";
    addoption.title = "Add another option";
    addoption.innerText = "+";
    ret.appendChild(addoption);
  }
  {
    const removeoption = document.createElement("button");
    removeoption.classList.add("removeoption");
    removeoption.type = "button";
    removeoption.title = "Remove last option";
    removeoption.innerText = "-";
    ret.appendChild(removeoption);
  }
  return ret;
})();

// textarea.option(rows=1 placeholder=Option)
const optionTemplate = document.createElement("textarea");
optionTemplate.classList.add("option");
optionTemplate.rows = 1;
optionTemplate.placeholder = "Option";

function addToForm(form, key = "", options = [""]) {
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
    .addEventListener("click", function (_event) {
      const newOption = optionTemplate.cloneNode(true);
      optionsEl.appendChild(newOption);
      this.parentElement
        .querySelector("button.removeoption")
        .toggleAttribute("hidden", false);
    });
  part
    .querySelector("button.removeoption")
    .addEventListener("click", function (_event) {
      if (optionsEl.children.length > 1) {
        if (optionsEl.children.length === 2)
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

export { generateForm, extractForm, addToForm };
