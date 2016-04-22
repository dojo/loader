# dojo-loader

[![Build Status](https://travis-ci.org/dojo/loader.svg?branch=master)](https://travis-ci.org/dojo/loader)
[![codecov.io](http://codecov.io/github/dojo/loader/coverage.svg?branch=master)](http://codecov.io/github/dojo/loader?branch=master)
[![npm version](https://badge.fury.io/js/dojo-loader.svg)](http://badge.fury.io/js/dojo-loader)

This package provides a JavaScript AMD loader useful in applications running in either a web browser, node.js or nashorn.

dojo-loader does not have any dependencies on a JavaScript framework.

## Features

- AMD loading
- CJS loading
- Plugins:
	- [text](https://github.com/dojo/core/blob/master/src/text.ts)
	- [has](https://github.com/dojo/core/blob/master/src/has.ts)
- Loading in a Nashorn environment

## How do I use this package?

### NPM
Install using npm: `npm --save-dev dojo-loader`

### Download from Git
Users can download and build directly from the repository if they wish.

From the loader root directory:

 1. npm install
 2. grunt dist

The "dist" subdirectory will contain the loader modules.

## Use the loader

Use a script tag to import the loader. This will make `require` and `define` available in the global namespace.

``` html
<script src='node_modules/dojo-loader/loader.min.js'></script>
```

The loader can load both AMD and CJS formatted modules.

There is no need to use the Dojo 1.x method of requiring node modules via `dojo/node!` plugin anymore.

## How do I contribute?

We appreciate your interest!  Please see the [Guidelines Repository](https://github.com/dojo/guidelines#readme) for the
Contributing Guidelines and Style Guide.

## Testing

Test cases MUST be written using Intern using the Object test interface and Assert assertion interface.

90% branch coverage MUST be provided for all code submitted to this repository, as reported by istanbul’s combined coverage results for all supported platforms.

## Licensing information

© 2004–2016 Dojo Foundation & contributors. [New BSD](http://opensource.org/licenses/BSD-3-Clause) license.
