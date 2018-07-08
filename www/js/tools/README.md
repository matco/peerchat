# js-tools
js-tools is a set of tools that will make your life easier when developing Javascript applications.

**extension.js** extends base Javascript classes with useful methods and helpers.

**dom_extension.js** extends DOM Javascript classes to make everyday DOM operations easier.

**lzw.js** is an implementation of LZW.

**timeframe.js** manages timeframe.

**reviver.js** transforms a tree or raw objects in a tree of typed object.

**bus.js** creates a bus for your events.

**uuid.js** generates UUIDs.

All tools are tested in their related file *.test.js.

## Usage
The branch ```subtreeable``` contains only required files (no tests). It allows to easily import these tools in your project using [Git subtree](https://git-scm.com/book/en/v1/Git-Tools-Subtree-Merging).

First, add this repository as a remote to your project:
```
git remote add -f js-tools https://github.com/matco/js-tools.git
```
Then, create the subtree from branch ```subtreeable``` (be sure to update the folder path in the command below):
```
git subtree add --prefix=js-tools-folder --squash js-tools/subtreeable
```

Later, to update code of tools in your project (again, update folder path in second command):
```
git fetch js-tools subtreeable
git subtree pull --prefix=js-tools-folder --squash js-tools subtreeable
```

You are free to remove any tool you don't need.
