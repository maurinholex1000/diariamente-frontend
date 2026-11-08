# DIAriaMENTE -- Frontend

Aplicación móvil de **DIAriaMENTE**, desarrollada con React Native y
Expo.

Este documento reúne los requisitos y comandos habituales para instalar,
ejecutar, probar y generar builds Android del frontend.

## Tecnologías

-   React Native
-   Expo
-   JavaScript
-   Firebase Authentication
-   Firebase Cloud Messaging (FCM)
-   EAS Build

## Requisitos previos

-   Node.js y npm instalados.
-   Cuenta de Expo y EAS CLI.
-   Android físico o emulador para probar la aplicación.
-   Repositorio clonado localmente.
-   Archivos de configuración de Firebase correspondientes al entorno.

> Usá la versión de Node.js y las versiones de dependencias definidas
> por el proyecto. No reemplaces archivos de Firebase ni compartas
> credenciales privadas.

## Instalación

Desde la carpeta raíz del frontend:

``` bash
npm install
```

## Ejecutar en desarrollo

### Expo Go

Si el proyecto y las dependencias son compatibles con Expo Go:

``` bash
npx expo start
```

Limpiar la caché de Metro:

``` bash
npx expo start -c
```

### Development Build / Development Client

Si tenés instalada en el dispositivo la APK de desarrollo:

``` bash
npx expo start --dev-client
```

Limpiar la caché:

``` bash
npx expo start --dev-client -c
```

Usar túnel si la conexión LAN no funciona:

``` bash
npx expo start --dev-client --tunnel
```

Con el servidor iniciado, abrí la aplicación **development build** en el
celular y escaneá el QR que muestra Metro. Para conexión LAN,
computadora y celular deben poder comunicarse por la misma red. El túnel
puede ayudar cuando esa conexión no está disponible.

> Una APK Preview o Production no es un Development Client: no se
> conecta a Metro para cargar el bundle JavaScript.

## EAS Build -- Android

Instalar EAS CLI si todavía no está disponible:

``` bash
npm install -g eas-cli
```

Iniciar sesión y verificar la cuenta:

``` bash
eas login
eas whoami
```

Consultar los builds:

``` bash
eas build:list
```

### Development

Generar un build para desarrollo con Development Client:

``` bash
eas build --profile development --platform android
```

### Preview

Generar un build de prueba independiente de Metro:

``` bash
eas build --profile preview --platform android
```

### Production

Generar el build de producción:

``` bash
eas build --profile production --platform android
```

> El formato generado (APK o AAB), la distribución y las opciones de
> cada perfil dependen de `eas.json`. Revisá ese archivo antes de
> generar un build. Para instalar directamente en un dispositivo
> Android, el perfil debe estar configurado para producir un APK cuando
> corresponda.

## Configuración Expo

Ver la configuración pública resuelta:

``` bash
npx expo config --type public
```

Verificar compatibilidad de dependencias con la versión de Expo:

``` bash
npx expo install --check
```

## Pruebas

Ejecutar los tests configurados en el proyecto:

``` bash
npm test
```

Ejecutar Jest directamente:

``` bash
npx jest
```

## Notificaciones push (FCM)

El frontend registra el token del dispositivo en el backend mediante:

``` text
POST /notifications/register-token
```

Puntos a tener en cuenta:

-   El permiso de notificaciones debe estar concedido.
-   El dispositivo debe obtener un token FCM válido.
-   El frontend debe enviar el token al backend cuando corresponda según
    el flujo de autenticación y consentimiento.
-   Un `200 OK` del endpoint confirma la respuesta del backend, pero no
    garantiza por sí solo que una notificación haya sido entregada.
-   Si se reinstala la aplicación o Firebase renueva el token, el nuevo
    token debe volver a registrarse.

No publiques tokens FCM, archivos de credenciales ni claves privadas.

## Git -- Flujo habitual

Consultar el estado:

``` bash
git status
```

Revisar cambios:

``` bash
git diff
```

Agregar cambios:

``` bash
git add .
```

Crear un commit:

``` bash
git commit -m "Descripción del cambio"
```

Subir a la rama `main`:

``` bash
git push origin main
```

Actualizar la copia local:

``` bash
git pull origin main
```

Consultar el historial:

``` bash
git log --oneline -10
```

## Recomendaciones

1.  Revisá `git status` antes de comenzar y antes de hacer un commit.
2.  No subas `.env`, credenciales Firebase, keystores, tokens ni
    secretos.
3.  Los cambios exclusivamente JavaScript normalmente no requieren
    generar una nueva APK; reiniciá Metro y probá el cambio.
4.  Los cambios en dependencias nativas, plugins o configuración nativa
    pueden requerir un nuevo Development Build.
5.  Usá Preview para probar una versión independiente de Metro y
    Production para distribución.
6.  Mantené actualizado `eas.json` y documentá cualquier variable de
    entorno necesaria sin incluir sus valores secretos.

## Repositorio

-   Frontend: https://github.com/maurinholex1000/diariamente-frontend
-   Backend: https://github.com/maurinholex1000/diariamente-backend
