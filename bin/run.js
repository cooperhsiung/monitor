#!/usr/bin/env node

/* eslint no-console: 0 */

const program = require('commander')
  .version(require('../package.json').version)
  .usage('[options] <tests>')
  .option('-p, --plugin <filename>', 'add a plugin', String)
  .option('-c, --concurrency <n>', 'monitor concurrency', parseInt)
  .option('-s, --shuffle', 'shuffle monitors and monitor sets')
  .option('-sm, --shuffle-monitors', 'shuffle monitors')
  .option('-sms, --shuffle-monitor-sets', 'shuffle monitor sets')
  .parse(process.argv)

const debug = require('debug')('monitor:bin')
const globby = require('globby')
const path = require('path')

const files = globby.sync(program.args)
debug('files: %o', files)

const monitorSetConfigs = files
  .map((filename) => {
    const config = require(path.resolve(filename))
    config.filename = filename
    config.id = config.id || filename
    return config
  })
  .filter(x => Array.isArray(x.monitors))

const runMonitors = require('../lib')

const options = {}
if (program.concurrency && !isNaN(program.concurrency)) options.concurrency = program.concurrency
if (program.shuffleMonitorSets || program.shuffle) options.shuffleMonitorSets = true
if (program.shuffleMonitors || program.shuffle) options.shuffleMonitors = true

const runner = runMonitors(monitorSetConfigs, options)

if (program.plugin) {
  const plugin = require(path.resolve(program.plugin))
  plugin(runner)
}

runner.exec().then((results) => {
  debug('%o', results)
  if (results.every(result => result.success)) {
    process.exitCode = 0
    return
  }

  process.exitCode = 1
}).catch((err) => {
  console.error(err.stack)
  process.exitCode = 1
})
