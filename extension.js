// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
// Import the commands
const {
  getCodeExplanation,
  showCodeExplanation,
  genCode,
} = require("./commands/main");

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

const config = vscode.workspace.getConfiguration("gemini-code-companion");

const errorMessage =
  "Something went wrong! Please make sure your API key is correct";
const failMessage = "Failed to get code Explanation!";

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "gemini-code-companion" is now active!'
  );

  // Create a sidepanel
  let panelDisposable = vscode.commands.registerCommand(
    "gemini-code-companion.explain",
    async function () {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("The editor is empty or not active");
        return;
      }
      // Get the code inside the editor
      const document = editor.document;
      const selection = editor.selection;
      const text = document.getText(selection);

      try {
        let explanation = await getCodeExplanation(text);
        if (!explanation) {
          explanation = errorMessage;
        }
        showCodeExplanation(explanation);
      } catch (err) {
        vscode.window.showErrorMessage(failMessage);
        console.error(err);
      }
    }
  );
  context.subscriptions.push(panelDisposable);

  // create code generation
  let codeGenDisposable = vscode.commands.registerCommand('gemini-code-companion.gen-code', () => {
    let editor = vscode.window.activeTextEditor;
    if (editor) {
        let selection = editor.selection;
        const document = editor.document;
        let fileName = editor.document.fileName;
        // let position = selection.end; // Get the end position of the selection
        const instruction = document.getText(selection);
        genCode(instruction, fileName, editor).then(success => {
            if (success) {
                vscode.window.showInformationMessage('Code inserted.');
            } else {
              vscode.window.showInformationMessage('Failed to generate code.');
            }
        }).catch(err => {
          vscode.window.showErrorMessage("Error in generating code:" + err);
      });
        // Insert text after the selection
        
    } else {
        vscode.window.showInformationMessage('No active editor found.');
    }
  });

  context.subscriptions.push(codeGenDisposable);

}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
