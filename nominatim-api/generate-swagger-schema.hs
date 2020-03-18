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
import Data.String (IsString (fromString))
import Data.Swagger hiding (fieldLabelModifier)
import Data.Swagger.Declare
import Data.Swagger.Internal.Schema (GToSchema)
import Data.Swagger.Internal.TypeShape (TypeHasSimpleShape)
import Data.Typeable

import Control.Lens.Operators ((?~), (.~))

import Servant.API
import Servant.Swagger


data JSONFormat = JSONFormat deriving (Enum, Bounded)

instance ToStringy JSONFormat where
  toStringy JSONFormat = "json"

instance ToJSON JSONFormat where
  toJSON = String . toStringy

instance ToParamSchema JSONFormat where
  toParamSchema = stringyEnumParamSchema

instance ToSchema JSONFormat where
  declareNamedSchema = pure . stringyEnumNamedSchema


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


data TestPlaceWrap
   = TestPlaceWrap
   { test_id ∷ Word
   , place   ∷ Place
   } deriving (Eq, Show, Generic)

instance ToJSON TestPlaceWrap where
  toJSON = myToJSON

instance ToSchema TestPlaceWrap where
  declareNamedSchema = myDeclareNamedSchema


type NominatimSearchApi
   = "search"
   ‣ QueryParam' '[Required, Strict] "format" JSONFormat
   ‣ QueryParam' '[Optional, Strict] "city"   String
   ‣ Get '[JSON] [Place]

   -- To test converting "Capture" to TypeScript types.
   -- An alternative endpoint of Nominatim.
   ‡ "search"
   ‣ Capture "query" String
   ‣ QueryParam' '[Required, Strict] "format" JSONFormat
   ‣ Get '[JSON] [Place]

   -- To test request body converting to TypeScript types.
   -- Not a real endpoint!
   ‡ "test"
   ‣ ReqBody '[JSON] [Place]
   ‣ Get '[JSON] JSONFormat

   -- Not a real endpoint!
   ‡ "test2"
   ‣ Get '[JSON] Word

   -- Not a real endpoint!
   ‡ "test3"
   ‣ Capture "number-list" [Word]
   ‣ Get '[JSON] Word

   -- Not a real endpoint!
   ‡ "test4"
   ‣ ReqBody '[JSON] [Word]
   ‣ Get '[JSON] TestPlaceWrap

   -- Not a real endpoint!
   ‡ "test5"
   ‣ ReqBody '[JSON] [[[JSONFormat]]]
   ‣ Get '[JSON] [[[Place]]]

   -- Not a real endpoint!
   ‡ "test6"
   ‣ "foo"
   ‣ Capture "bar" String
   ‣ "baz"
   ‣ "bzz"
   ‣ Capture "zzz" String
   ‣ "aaa"
   ‣ ReqBody '[JSON] [[[JSONFormat]]]
   ‣ Get '[JSON] [[[Place]]]


main ∷ IO ()
main
  = toSwagger (Proxy @NominatimSearchApi)
  & encodePretty
  & Data.ByteString.Lazy.Char8.putStrLn


-- * Helpers


class ToStringy a where
  toStringy ∷ IsString s ⇒ a → s


stringyEnumParamSchema
  ∷ ∀ a t
  . (Enum a, Bounded a, ToStringy a)
  ⇒ Proxy a
  → ParamSchema t

stringyEnumParamSchema (Proxy ∷ Proxy a)
  = mempty
  & type_ ?~ SwaggerString
  & enum_ ?~ [toStringy x | x ← [minBound .. maxBound ∷ a]]


stringyEnumNamedSchema
  ∷ ∀ a
  . (Enum a, Bounded a, ToStringy a, Typeable a)
  ⇒ Proxy a
  → NamedSchema

stringyEnumNamedSchema p@(Proxy ∷ Proxy a)
  = NamedSchema (Just $ fromString $ show $ typeRep p)
  $ mempty
  & paramSchema .~ stringyEnumParamSchema p


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
dig ,, 8225       | dig .. 8227
-}
type (‡) = (:<|>) ; type (‣) = (:>)
infixr 8 ‡        ; infixr 9 ‣
