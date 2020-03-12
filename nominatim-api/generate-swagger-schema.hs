#! /usr/bin/env nix-shell
#! nix-shell -p "haskell.packages.ghc865.ghc.withPackages (p: with p; [bytestring aeson aeson-pretty lens servant servant-swagger swagger2])"
#! nix-shell -i runhaskell
{-# OPTIONS_GHC -Wall -Wno-missing-signatures #-}
{-# LANGUAGE UnicodeSyntax, LambdaCase, TypeOperators #-}
{-# LANGUAGE DataKinds, PolyKinds, TypeApplications #-}
{-# LANGUAGE ScopedTypeVariables, TypeFamilies #-}
{-# LANGUAGE DeriveGeneric, OverloadedStrings #-}
{-# LANGUAGE FlexibleContexts #-}

-- Prints Swagger schema to stdout.

import GHC.Generics

import Data.Aeson
import Data.Aeson.Encode.Pretty
import Data.ByteString.Lazy.Char8
import Data.Function
import Data.Proxy
import Data.String (IsString)
import Data.Swagger hiding (fieldLabelModifier)
import Data.Swagger.Declare
import Data.Swagger.Internal.Schema (GToSchema)
import Data.Swagger.Internal.TypeShape (TypeHasSimpleShape)

import Control.Lens.Operators ((?~))

import Servant.API
import Servant.Swagger


data JSONFormat = JSONFormat deriving (Enum, Bounded)

instance ToStringy JSONFormat where
  toStringy JSONFormat = "json"

instance ToJSON JSONFormat where
  toJSON = String . toStringy

instance ToParamSchema JSONFormat where
  toParamSchema = stringyEnumSchema


data Place
   = Place
   { place_id     ∷ Word
   , lat          ∷ String
   , lon          ∷ String
   , display_name ∷ String
   , _class       ∷ String
   , _type        ∷ String
   } deriving (Eq, Show, Generic)

instance ToJSON Place where
  toJSON = myToJSON

instance ToSchema Place where
  declareNamedSchema = myDeclareNamedSchema


type NominatimSearchApi
   = "search"
   ‣ QueryParam' '[Required, Strict] "format" JSONFormat
   ‣ QueryParam' '[Optional, Strict] "city"   String
   ‣ Get '[JSON] [Place]


main ∷ IO ()
main
  = toSwagger (Proxy @NominatimSearchApi)
  & encodePretty
  & Data.ByteString.Lazy.Char8.putStrLn


-- * Helpers


class ToStringy a where
  toStringy ∷ IsString s ⇒ a → s


stringyEnumSchema
  ∷ ∀ a t
  . (Enum a, Bounded a, ToStringy a)
  ⇒ Proxy a
  → ParamSchema t

stringyEnumSchema (Proxy ∷ Proxy a)
  = mempty
  & type_ ?~ SwaggerString
  & enum_ ?~ [toStringy x | x ← [minBound .. maxBound ∷ a]]


myToJSONOptions ∷ Options
myToJSONOptions
  = defaultOptions
  { fieldLabelModifier = \case ('_' : xs) → xs; x → x }


myToJSON ∷ (Generic a, GToJSON Zero (Rep a)) ⇒ a → Value
myToJSON = genericToJSON myToJSONOptions


myDeclareNamedSchema
  ∷
  ( Generic a
  , GToSchema (Rep a)
  , TypeHasSimpleShape a "myDeclareNamedSchema"
  )
  ⇒ Proxy a
  → Declare (Definitions Schema) NamedSchema

myDeclareNamedSchema
  = genericDeclareNamedSchemaUnrestricted
  $ fromAesonOptions myToJSONOptions


{-
vim digraphs for these unicode symbols:
dig ,, 8225   | dig .. 8227
-}
(‡) = (:<|>)  ; type (‣) = (:>)
infixr 8 ‡    ; infixr 9 ‣
