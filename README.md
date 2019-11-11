# NPM Package Dependency Mapper:
> Goal: Design and build a web service that gets a package name and returns full package dependency tree.

Assumptions:
* The dependencies for "[packageName]@[packageVersion]" are immutable, e.g: if we cache 'express@1.1' and it's deps, it's assumed it'll never change
* There is no limit on cache size and expiry
* For the sake of simplicity, package semver version annotations ('~', '^', '*', etc) will be ignored and considered as explicitly version
* We'll be ignoring devDependencies
* Git-URLs Dependencies (e.g: 'git+'/'git@') will be treated as 'latest'
* A global module (libx) is used for simplicity, otherwise best practice is to explicitly require in each dependant module
* Packages/dependencies like `@types/node` are not supported as `https://registry.npmjs.org/<package_name>/<version_or_tag>` will result in 404/401


Design:
* Since we cannot know the full dependencies map without fetching packages one-by-one and progressively, we have to design a system which will both allow progressive discovery of dependencies and at the same time support receiving new requests to map new [root] packages.  
As in mathematics/combinatorics, I choose to break down the problem into 2 separate problems:
	1. Problem #1: `Progressive Fetch`   
	Get all dependencies and their dependencies, recursively. While designing the system to support multiple requests of such kind and serve them in efficient manner.   
	(root package name -> deep dependencies -> each stored in cache)
	2. Problem #2: `Tree Hierarchy Map`   
	Once all dependencies of a given package are now available in memory, crawl and create a "tree" (linked-list of nodes) to represent the hierarchy.  
	(root package name -> map to packages in cache -> tree object)   
	Once we have an object representing the tree of hierarchy we can easily crawl down the tree and print a map of all deep dependencies.
* New requests are queued into network level queue and we track `fetch` progress by writing and deleting pending deps per each root package (in a flat manner). Each new root package is also registered with a 'master promise', which will be triggered once all its deep deps are resolved.
* Each time we hit 'end of the road' (reached a dependency that does not have any more dependencies) we check all root packages to see if there's one that have all its dependencies resolved.
* Once `fetch` process is done, we trigger the master promise of that package and it's now easy to recursively crawl a package down its deps hierarchy.

![image](https://user-images.githubusercontent.com/246724/68532273-01ac5a80-0324-11ea-8b4f-0ba268ca91b8.png)


Compromises:
* In favor of simplicity, a given dependency might be resolved multiple times __concurrently__ when it's being enqueued from the 1st level of deps, and from a deeper level while the first hasn't been resolved yet, or if same package is enqueued simultaneously. In ideal implementation I'd create an 'in-progress' hash-map, mapping packageId to a promise, so before enqueuing them check if in progress and register to its promise,  avoiding enqueue of same package.

Example Output:   
`$ yarn start --name body-parser --ver 1.19.0`
```
 - body-parser@1.19.0
         - bytes@3.1.0
         - content-type@1.0.4
         - debug@2.6.9
                 - ms@2.0.0
         - depd@1.1.2
         - http-errors@1.7.2
                 - depd@1.1.2
                 - inherits@2.0.3
                 - setprototypeof@1.1.1
                 - statuses@1.5.0
                 - toidentifier@1.0.0
         - iconv-lite@0.4.24
                 - safer-buffer@2.1.2
         - on-finished@2.3.0
                 - ee-first@1.1.1
         - qs@6.7.0
         - raw-body@2.4.0
                 - bytes@3.1.0
                 - http-errors@1.7.2
                         - depd@1.1.2
                         - inherits@2.0.3
                         - setprototypeof@1.1.1
                         - statuses@1.5.0
                         - toidentifier@1.0.0
                 - iconv-lite@0.4.24
                         - safer-buffer@2.1.2
                 - unpipe@1.0.0
         - type-is@1.6.17
                 - media-typer@0.3.0
                 - mime-types@2.1.24
                         - mime-db@1.40.0
```


## Dependencies:
- [libx.js](https://github.com/Livshitz/libx.js) - multi-purpose toolbox with plenty of helpers, wrappers and useful modules
- [express](https://github.com/expressjs/express) - http web server
- [jest](https://github.com/facebook/jest) - tests


## Setup:
* Install dependencies:   
```yarn install```

* Build before running:   
```yarn build```


## How to use:
- Run as NodeJS script   
`yarn start`   
(example: `yarn start --name express --ver 4.17.1`)

- Start local server   
`yarn serve`   
(see endpoints bellow)

- Run tests:   
```yarn test```   


## Endpoints:
- `[GET] /get-dependencies/:packageName/:packageVersion?`  
Returns mini-map schema of the dependencies map

** Default endpoing is: [http://localhost:5678/](http://localhost:5678/)


## Develop:
* Run build and watch:   
```yarn watch```
