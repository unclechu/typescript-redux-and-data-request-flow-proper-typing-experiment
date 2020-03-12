# Proof of Concept

It's a prototype of TypeScript & Redux project
that brings 2 main things to the table:

1. [x] Proper discriminated typing for different state of
   data requesting (like ADT type in Haskell, no need to
   provide any dummy value plugs for all the fields of data
   model as well as you don't need to make all of the fields
   being nullable/optional which wouldn't be a correct data
   model)

2. [ ] Validating data by Swagger model in runtime when
   receiving that data from a server which solves the issue
   when types are correct but JavaScript don't parse but
   just eats whatever JSON a server gives to it, and while
   your whole project is being well-typed you get that awful
   "undefined bla-bla something" exception with no clue of
   what went wrong

## Requirements

1. [nix](https://nixos.org/nix/) package manager

## Run

```sh
(cd nominatim-api && ./generate-swagger-schema.hs > schema.json)
nix-shell -p nodejs-12_x --run 'npm i && npm start'
```

# Author

Viacheslav Lotsmanov
