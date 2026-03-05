/**
 * O-03: Binary Package Generator
 * Generates a zip archive (installer bundle) for a given product version.
 * Bundles a README, install script, and version manifest.
 */
import archiver from 'archiver';
import { PassThrough } from 'stream';

export interface BinaryPackageOptions {
  productName: string;     // e.g. "My App"
  version: string;         // e.g. "1.2.3"
  customerName: string;    // for personalized README
  releaseNotes?: string;
  installScript?: string;     // custom install.sh content
  windowsScript?: string;     // custom install.bat content
}

/**
 * Builds a binary installer package as a zip Buffer in memory.
 * Structure: {productName}-{version}/README.md + install.sh + install.bat + manifest.json
 */
export function generateBinaryPackage(opts: BinaryPackageOptions): Promise<Buffer> {
  const {
    productName,
    version,
    customerName,
    releaseNotes = 'Bu sürüm hakkında ek bilgi bulunmamaktadır.',
    installScript,
    windowsScript,
  } = opts;

  const dirName = `${productName.toLowerCase().replace(/\s+/g, '-')}-${version}`;
  const timestamp = new Date().toISOString();

  const readme = `# ${productName} v${version}

**Müşteri:** ${customerName}  
**Paket oluşturma tarihi:** ${timestamp}

## Kurulum

### Linux / macOS

\`\`\`bash
chmod +x install.sh
./install.sh
\`\`\`

### Windows

\`\`\`bat
install.bat
\`\`\`

## Sürüm Notları

${releaseNotes}

## Destek

Herhangi bir sorun yaşarsanız lütfen destek ekibimizle iletişime geçin.
`;

  const defaultInstallSh = installScript ?? `#!/bin/bash
# ${productName} v${version} Installer
# Generated for: ${customerName}
# Date: ${timestamp}

set -e

echo "============================================"
echo " ${productName} v${version} Kurulum Scripti"
echo "============================================"
echo ""
echo "Müşteri: ${customerName}"
echo "Tarih: $(date)"
echo ""

# Check prerequisites
if ! command -v docker &> /dev/null; then
  echo "HATA: Docker kurulu değil. Lütfen önce Docker yükleyin."
  exit 1
fi

echo "Docker sürümü: $(docker --version)"
echo ""
echo "Kurulum başlıyor..."

# Pull and run (placeholder — customize with actual image)
# docker pull your-registry/${productName.toLowerCase().replace(/\s+/g, '-')}:${version}
# docker run -d --name ${productName.toLowerCase().replace(/\s+/g, '-')} \\
#   -p 80:8080 \\
#   your-registry/${productName.toLowerCase().replace(/\s+/g, '-')}:${version}

echo ""
echo "✅ Kurulum tamamlandı!"
echo "${productName} v${version} başarıyla kuruldu."
`;

  const defaultWindowsBat = windowsScript ?? `@echo off
REM ${productName} v${version} Windows Installer
REM Generated for: ${customerName}
REM Date: ${timestamp}

echo ============================================
echo  ${productName} v${version} Kurulum Scripti
echo ============================================
echo.
echo Musteri: ${customerName}
echo.

where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo HATA: Docker kurulu degil. Lutfen once Docker yukleyin.
  exit /b 1
)

echo Docker surumu:
docker --version
echo.
echo Kurulum basliyor...

REM docker pull your-registry/${productName.toLowerCase().replace(/\s+/g, '-')}:${version}
REM docker run -d --name ${productName.toLowerCase().replace(/\s+/g, '-')} ^
REM   -p 80:8080 ^
REM   your-registry/${productName.toLowerCase().replace(/\s+/g, '-')}:${version}

echo.
echo Kurulum tamamlandi!
pause
`;

  const manifest = JSON.stringify(
    {
      product: productName,
      version,
      customer: customerName,
      generatedAt: timestamp,
      packageType: 'BINARY_INSTALLER',
      files: ['README.md', 'install.sh', 'install.bat', 'manifest.json'],
    },
    null,
    2,
  );

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const pass = new PassThrough();

    pass.on('data', (chunk: Buffer) => chunks.push(chunk));
    pass.on('end', () => resolve(Buffer.concat(chunks)));
    pass.on('error', reject);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', reject);
    archive.pipe(pass);

    archive.append(readme, { name: `${dirName}/README.md` });
    archive.append(defaultInstallSh, { name: `${dirName}/install.sh`, mode: 0o755 });
    archive.append(defaultWindowsBat, { name: `${dirName}/install.bat` });
    archive.append(manifest, { name: `${dirName}/manifest.json` });

    archive.finalize();
  });
}
