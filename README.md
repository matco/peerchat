js-tools
==========
js-tools is a set of tools for developing Javascript applications.

**extension.js** extends base Javascript classes with useful methods and helpers.

**dom_extension.js** extends DOM Javascript classes to make everyday DOM operations easier.

**lzw.js** is an implementation of LZW.

**timeframe.js** manages timeframe.

**reviver.js** transforms a tree or raw objects in a tree of typed object.

**bus.js** creates a bus for your events.

**uuid.js** generates UUIDs.

All tools are tested in their related file *.test.js.

Usage
----------
The branch ```subtreeable``` can be used to import tools in your projects using [Git subtree](http://git-scm.com/book/ch6-7.html).
* Add this repository as a remote to your project
```
git remote add -f js-tools https://github.com/matco/js-tools.git
```
* Create the subtree from branch ```subtreeable```
```
git subtree add --prefix js-tools-folder js-tools/subtreeable --squash
```
* Update js-tools in your project
```
git fetch js-tools subtreeable
git subtree pull --prefix js-tools-folder js-tools subtreeable --squash
```

You are free to remove any tool you don't need.
