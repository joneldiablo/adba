# Fix para Problemas de Release - ADBA

## Problema Identificado

El error de release estaba causado por:
1. **Conflicto de registries**: Yarn configurado con `https://registry.yarnpkg.com` vs npm necesitando `https://registry.npmjs.org/`
2. **Variables de entorno**: npm warnings sobre configuraciones desconocidas
3. **Autenticación mixta**: Scripts usando npm pero entorno configurado para yarn

## Soluciones Implementadas

### 1. Scripts Mejorados

#### `setup-npm.sh` - Configuración Inicial
- Configura npm registry específicamente para npmjs.org
- Verifica autenticación y proporciona instrucciones de login

#### `verify-release.sh` - Verificación Mejorada
- Fuerza el uso del registry correcto
- Filtra warnings de npm
- Verifica autenticación con registry específico

#### `release.sh` - Release Principal Mejorado
- Limpia variables de entorno que causan warnings
- Fuerza registry de npm en todas las operaciones
- Mejor manejo de errores y debug information

#### `publish-only.sh` - Publicación Rápida
- Para casos donde build/version ya están hechos
- Solo ejecuta npm publish con configuración correcta
- Útil para recuperar releases fallidos

### 2. Configuraciones Aplicadas

```bash
# Variables de entorno limpiadas
unset npm_config_version_commit_hooks
unset npm_config_version_tag_prefix  
unset npm_config_version_git_message
unset npm_config_argv
unset npm_config_version_git_tag

# Registry forzado
export NPM_CONFIG_REGISTRY="https://registry.npmjs.org/"
npm config set registry https://registry.npmjs.org/ --location=user
```

### 3. Comandos Específicos Actualizados

Todos los comandos npm ahora usan `--registry=https://registry.npmjs.org/`:
- `npm whoami --registry=https://registry.npmjs.org/`
- `npm publish --registry https://registry.npmjs.org/`
- `npm login --registry=https://registry.npmjs.org/`

## Flujo de Trabajo Actualizado

### Para Release Completo:
```bash
./setup-npm.sh           # Solo primera vez
./verify-release.sh      # Verificar prerrequisitos
./release.sh --otp XXX   # Release completo
```

### Para Publicar Version Existente:
```bash
./setup-npm.sh           # Solo primera vez si es necesario
./publish-only.sh --otp XXX  # Solo publicar
```

## Estado Actual

- ✅ Version 1.0.22 ya construida y taggeada en Git
- ✅ Scripts de release corregidos
- ✅ Configuración de npm arreglada
- ⏳ Pendiente: Ejecutar `./publish-only.sh --otp TU_OTP` para publicar 1.0.22

## Archivos Modificados

- `release.sh` - Script principal mejorado
- `verify-release.sh` - Verificación mejorada
- `setup-npm.sh` - Nuevo script de configuración
- `publish-only.sh` - Nuevo script de publicación rápida
- `RELEASE.md` - Documentación actualizada

## Próximos Pasos

1. Ejecutar `./publish-only.sh --otp TU_OTP` para publicar la versión 1.0.22
2. Para futuros releases, usar el flujo completo con los scripts mejorados
3. El problema de registry mixto ahora está resuelto permanentemente