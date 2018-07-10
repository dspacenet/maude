# MaudeProcess

MaudeProcess is a JavaScript interface to the Maude System, originally wrote by Hector Delgado for Python, MaudeProcess executes Maude in an interactive mode allowing the execution of rewriting and general commands in a natural way using the latest features of ES6.

## Getting Started

A copy of the executable of Maude System is required. No other dependencies are required.

### Installing

```bash
npm install @dspacenet/maude
```

### Usage

```JavaScript
const MaudeProcess = require('@dspacenet/maude');

// Instantiate MaudeProcess
const maude = new MaudeProcess('path/to/maude/executable/');

// Execute a command.
maude.run('your command').then(({ result }) => {
  // Print the result
  console.log(result);
}).catch(( error ) => {
  // Catch errors emitted by maude.
  console.log(error.message);
})

// Destroy MaudeProcess when the work is done
maude.destroy();
```

## Running the tests

In order to run the tests, the environment variable `MAUDE_PATH` must have the path to the executable of the Maude System.

```bash
MAUDE_PATH="/path/to/maude/executable" npm test
```

## Authors

* **Hector Delgado** - *Initial work in Python* - [HectorDD](https://github.com/HectorDD)
* **Jason Lopez** - *JavaScript Implementation* - [KinIcy](https://github.com/KinIcy)