const { spawn, execSync } = require('child_process');
const path = require('path');

/**
 * Error relative to the Maude System.
 */
class MaudeError extends Error {
  /**
   * @param {String=} message
   */
  constructor(message = '') {
    super(message);
    this.name = 'MaudeError';
  }
}

/**
 * Main class for handling maude process.
 *
 * @typedef ExecutionResult
 * @prop {String} raw raw execution result
 * @prop {String} command command executed
 * @prop {Number} rewrites amount of rewrites done
 * @prop {Number} cpuTime cpu usage time in ms
 * @prop {Number} time total time the operation took in ms
 * @prop {String} rewritesPerSecond
 * @prop {String} result execution result
 */
class MaudeProcess {
  /**
   * Creates a new MaudeProcess. Tests if maude can be executed, if so, the
   * process is created, otherwise, a error is thrown.
   *
   * @typedef MaudeProcessOptions
   * @prop {Number} timeLimit time limit for individual executions. If this time
   * is surpassed, a timeout error will be thrown
   *
   * @param {String} maudePath path to maude executable
   * @param {MaudeProcessOptions} options
   *
   * @throws {Error} if Maude can not be executed.
   */
  constructor(maudePath, options = {}) {
    this.maudePath = path.resolve(__dirname, maudePath);
    this.queue = [];
    this.timeLimit = options.timeLimit || 1000;
    try {
      this.version = this.getVersion();
    } catch (error) {
      throw new Error(`An error ocurred trying to start Maude: ${error.message}`);
    }
    this.spawnProcess();
  }

  /**
   * Gets from maude the version that is being executed.
   * @returns {String}
   */
  getVersion() {
    return execSync(`${this.maudePath} --version`).toString().trim();
  }

  /**
   * Spawns a new maude process to be used for maude executions. After the
   * process has been spawned, the busy flag is set to true until a data event
   * is emitted so the output stream is cleared for future executions
   *
   * @todo Add options to handle each flag.
   * @todo ensure that the prelude was correctly loaded, throw error if not.
   */
  spawnProcess() {
    this.process = spawn(
      this.maudePath,
      ['-no-banner', '-no-advise', '-no-wrap', '-no-tecla', '-batch'],
      { cwd: path.dirname(this.maudePath) },
    );
    this.busy = true;
    this.process.stdout.once('data', () => {
      this.busy = false;
      this.next();
    });
  }

  /**
   * Executes the given `command` in the maude process and return a promise with
   * the result from the execution. Ensures the command ends in a line-break.
   * @param {String} command
   * @returns {Promise<ExecutionResult>}
   *
   * @todo add individual execution options such as time limit
   */
  run(command) {
    const patchedCommand = /\n$/.test(command) ? command : `${command}\n`;
    return new Promise((resolve, reject) => this.getResult(patchedCommand, resolve, reject));
  }

  /**
   * Put in the execution queue a new `command` with its respective `resolve`
   * and `reject` promise's callbacks
   * @param {String} command
   * @param {Function} resolve
   * @param {Function} reject
   */
  getResult(command, resolve, reject) {
    this.queue.push({ command, resolve, reject });
    this.next();
  }

  /**
   * Executes the next command in the execution queue if the process is not busy
   * and there are commands pending execution. Listeners are attached to the
   * output and error streams to capture the result data and errors
   * respectively, a timeout is set with the execution time limit. If the
   * execution is successfully, an attempt will be made to formated the result,
   * if not possible, the raw result will be used to resolve the promise.
   *
   * At the end of the execution (successfully or not) the listeners in the
   * output stream and error stream, and the timeout are removed.
   *
   * @throws {MaudeError} when the execution results in a warning or when the
   * execution is taking more time than the time limit.
   *
   * @todo add option to choose if the should be renewed when the execution
   * fails or is timeout.
   * @todo add support for automatic result formating for other operations than
   * reduce
   * @todo add test for correct execution of enqueued commands.
   */
  next() {
    if (!this.busy && this.queue.length > 0) {
      let data = '';
      let errorData = '';
      const { command, resolve, reject } = this.queue.shift();
      this.busy = true;
      this.timeout = setTimeout(() => {
        this.destroy();
        this.spawnProcess();
        reject(new MaudeError('Timeout.'));
      }, this.timeLimit);
      this.process.stdout.on('data', (chunk) => {
        data += chunk;
        // "Maude> " is the last line maude outputs when an execution was successfully.
        if (/Maude> $/.test(data)) {
          const matches = data.match(/^=+\n(.+)\nrewrites: (\d+) in (\d+)ms cpu \((\d+)ms real\) \((.+) rewrites\/second\)\nresult (.+)\s+Maude> $/);
          if (matches !== null) {
            resolve({
              raw: matches[0],
              command: matches[1],
              rewrites: Number(matches[2]),
              cpuTime: Number(matches[3]),
              time: Number(matches[4]),
              rewritesPerSecond: matches[5],
              result: matches[6],
            });
          } else {
            resolve({ command, raw: data.match(/(.*)\nMaude> $/)[1] });
          }
          this.clearAndNext();
        }
      });
      this.process.stderr.on('data', (chunk) => {
        errorData += chunk;
        if (/^Warning: /.test(errorData)) {
          this.clearAndNext();
          reject(new MaudeError(errorData.trim()));
        }
      });
      this.process.stdin.write(command);
    }
  }

  /**
   * Reset the state of the process, so a new command can be executed. Removes
   * the event listeners added during the execution of a command, clears the
   * timeout and set the busy flag to false.
   *
   * Defer the execution of the next command to the next process tick.
   *
   * @todo ensure that no data is left in output stream.
   */
  clearAndNext() {
    this.process.stdout.removeAllListeners('data');
    this.process.stderr.removeAllListeners('data');
    clearTimeout(this.timeout);
    this.busy = false;
    process.nextTick(() => this.next());
  }

  /**
   * Destroys the process.
   */
  destroy() {
    this.process.kill('SIGINT');
  }
}

module.exports = MaudeProcess;
