# Media Package

Frontend package for media file management.

## Features

- Browse and view uploaded files
- Upload new files
- Organize files in folders
- Delete files
- Download files

## Usage

```typescript
import { MediaFileList, mediaFileService, mediaFolderService } from '@/packages/media'
```

## Telepítés

A PHP csomag (`istvanmolitor/media`) seeder-jét regisztrálni kell a fő projekt `database/seeders/DatabaseSeeder.php`-jában:

```php
use Molitor\Media\Database\Seeders\MediaSeeder;

$this->call([
    MediaSeeder::class,
]);
```

## Integráció az adminba

**menuRegistry.js** — regisztráld a menu buildert:

```js
import { MediaMenuBuilder } from '@media/config/menuBuilder'

menuRegistry.register(new MediaMenuBuilder())
```

**app.js** — add hozzá a route-okat:

```js
import mediaRoutes from '@media/router/index'

const routes = [
    ...mediaRoutes,
]
```
