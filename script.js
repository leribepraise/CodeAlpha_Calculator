// After pressing 3:
// currentInput = "3"
// previousInput = "7"
// operator = +

// After pressing =:
// currentInput = "10"
// previousInput = ""
// operator = ""

// ---------- state ----------
let justCalculated = false;
let expression = "";

// ---------- elements ----------
const viewer = document.querySelector("#viewer");
const input = document.querySelector("#input");
const nums = document.querySelectorAll(".nums");
const ops = document.querySelectorAll(".ops");
const decimal = document.querySelector(".decimal");
const equal = document.querySelector(".equal");
const clear = document.querySelector(".clear");
const backspace = document.querySelector(".backspace");
const openBtn = document.querySelector(".open");
const closeBtn = document.querySelector(".close");

const MAX_DIGITS = 8;

// ---------- helpers ----------
const isOperator = (ch) => "+-*/".includes(ch);

// counts how many times a character appears in a string
const countChar = (str, ch) => str.split(ch).length - 1;

const getLastNumber = () => {
  const pieces = expression.split(/[+\-*/()]/);
  return pieces[pieces.length - 1];
};

const formatResult = (num) => {
  // Part 1: plain numbers. Try the most precision first, back off until it fits.
  for (let p = MAX_DIGITS; p >= 1; p--) {
    const str = String(Number(num.toPrecision(p)));
    if (str.length <= MAX_DIGITS) return str;
  }

  // Part 2: too big for plain notation, so use scientific notation.
  for (let d = MAX_DIGITS; d >= 0; d--) {
    const str = num.toExponential(d);
    if (str.length <= MAX_DIGITS) return str;
  }

  return "Error";
};

const showError = () => {
  expression = "";
  justCalculated = false;

  input.value = "Error";
  viewer.value = "";
};

// ---------- parsing and evaluating ----------
const tokenize = (str) => {
  const tokens = [];
  let num = "";

  for (const ch of str) {
    if ("0123456789.".includes(ch)) {
      num += ch;
    } else {
      if (num !== "") {
        tokens.push(num);
        num = "";
      }
      tokens.push(ch);
    }
  }

  if (num !== "") tokens.push(num);

  return tokens;
};

const evaluate = (tokens) => {
  let pos = 0;

  // Level 3: a number, a unary minus, or a bracketed expression
  const parseFactor = () => {
    const token = tokens[pos];
    pos++;

    if (token === "-") {
      return -parseFactor();
    }

    if (token === "(") {
      const value = parseExpression();
      pos++; // skip the closing ")"
      return value;
    }

    return parseFloat(token);
  };

  // Level 2: * and /
  const parseTerm = () => {
    let result = parseFactor();

    while (tokens[pos] === "*" || tokens[pos] === "/") {
      const op = tokens[pos];
      pos++;
      const right = parseFactor();

      if (op === "*") result = result * right;
      else result = result / right;
    }

    return result;
  };

  // Level 1: + and -
  const parseExpression = () => {
    let result = parseTerm();

    while (tokens[pos] === "+" || tokens[pos] === "-") {
      const op = tokens[pos];
      pos++;
      const right = parseTerm();

      if (op === "+") result = result + right;
      else result = result - right;
    }

    return result;
  };

  return parseExpression();
};

// ---------- button handlers ----------
nums.forEach((button) => {
  button.addEventListener("click", () => {
    if (justCalculated) {
      expression = "";
      justCalculated = false;
      viewer.value = "";
    }
    if (expression.slice(-1) === ")") return;

    if (getLastNumber().length >= MAX_DIGITS) return;

    if (getLastNumber() === "0") {
      expression = expression.slice(0, -1) + button.dataset.num;
    } else {
      expression += button.dataset.num;
    }

    input.value = expression;
  });
});

ops.forEach((op) => {
  op.addEventListener("click", () => {
    const symbol = op.textContent;
    const lastChar = expression.slice(-1);

    // block continuing from a scientific-notation result
    if (justCalculated && expression.includes("e")) return;

    // empty screen or right after "(": only "-" is allowed (as a unary minus)
    if (expression === "" || lastChar === "(") {
      if (symbol !== "-") return;
      expression += symbol;
      input.value = expression;
      return;
    }

    // last character is an operator
    if (isOperator(lastChar)) {
      const before = expression.slice(-2, -1);

      // a leading "-" is a unary minus, so it must NOT be swapped
      const isUnary = before === "" || before === "(";
      if (isUnary) return;

      // NEW: "-" right after "*" or "/" is a unary minus, so append it ("5*-")
      if (symbol === "-" && (lastChar === "*" || lastChar === "/")) {
        expression += symbol;
        input.value = expression;
        return;
      }

      // NEW: if the expression ends in an operator plus a unary minus
      // (like "5*-"), replace BOTH characters, otherwise a stray "*" is left behind
      if (isOperator(before)) {
        expression = expression.slice(0, -2) + symbol;
      } else {
        expression = expression.slice(0, -1) + symbol;
      }
    } else {
      expression += symbol;
    }

    // an operator continues from the result, so "just calculated" ends
    justCalculated = false;
    input.value = expression;
  });
});

decimal.addEventListener("click", () => {
  // after "=", a "." starts a new number (same rule as digits)
  if (justCalculated) {
    expression = "";
    justCalculated = false;
    viewer.value = "";
  }
  if (expression.slice(-1) === ")") return;

  const last = getLastNumber();

  if (last.includes(".")) return; // already has a dot
  if (last.length >= MAX_DIGITS) return; // too long

  if (last === "") {
    expression += "0."; // empty number -> start with 0.
  } else {
    expression += ".";
  }

  input.value = expression;
});

const handleEquals = () => {
  if (expression === "") return;
  const last = expression.slice(-1);
  if (isOperator(last) || last === "(") return;

  const open = countChar(expression, "(");
  const closed = countChar(expression, ")");

  // auto-close any brackets the user left open
  if (open > closed) {
    expression += ")".repeat(open - closed);
  }

  const result = evaluate(tokenize(expression));

  if (!Number.isFinite(result)) {
    showError();
    return;
  }

  viewer.value = expression + " =";
  expression = formatResult(result);
  justCalculated = true;
  input.value = expression;
};

equal.addEventListener("click", handleEquals);

clear.addEventListener("click", () => {
  expression = "";
  justCalculated = false;

  input.value = "";
  viewer.value = "";
});

backspace.addEventListener("click", () => {
  // a scientific-notation result can't be edited sensibly, so reset
  if (expression.includes("e")) {
    clear.click();
    return;
  }

  justCalculated = false;
  expression = expression.slice(0, -1);
  input.value = expression;
});

openBtn.addEventListener("click", () => {
  if (justCalculated) {
    expression = "";
    justCalculated = false;
    viewer.value = "";
  }

  const last = expression.slice(-1);

  // "(" is only allowed: on an empty screen, after an operator, or after another "("
  if (expression !== "" && !isOperator(last) && last !== "(") return;

  expression += "(";
  input.value = expression;
});

closeBtn.addEventListener("click", () => {
  const last = expression.slice(-1);
  const open = countChar(expression, "(");
  const closed = countChar(expression, ")");

  if (open <= closed) return; // nothing left to close
  if (isOperator(last) || last === "(") return; // would give "2+)" or "()"

  expression += ")";
  input.value = expression;
});

// ---------- keyboard support ----------
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  const key = e.key;
  let button = null;

  if (key >= "0" && key <= "9") {
    button = [...nums].find((b) => b.dataset.num === key);
  } else if (isOperator(key)) {
    button = [...ops].find((b) => b.textContent.trim() === key);
  } else if (key === "." || key === ",") {
    button = decimal;
  } else if (key === "Enter" || key === "=") {
    button = equal;
  } else if (key === "Backspace") {
    button = backspace;
  } else if (key === "Escape" || key === "Delete") {
    button = clear;
  } else if (key === "(") {
    button = openBtn;
  } else if (key === ")") {
    button = closeBtn;
  }

  if (!button) return;

  e.preventDefault();
  button.click();
});
