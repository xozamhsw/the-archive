/**
 * RPP02N Bluetooth Thermal Printer
 *
 * Transport:
 * Browser
 * -> Web Bluetooth
 * -> BLE GATT
 * -> Writable Characteristic
 * -> ESC/POS
 *
 * Mendukung:
 * - Cetak receipt
 * - Cetak foto thermal
 *
 * RPP02N:
 * - 58mm
 * - 384 dots printable width
 * - ESC/POS
 */

type BluetoothCharacteristicPropertiesLike = {
  broadcast?: boolean;
  read?: boolean;
  writeWithoutResponse?: boolean;
  write?: boolean;
  notify?: boolean;
  indicate?: boolean;
  authenticatedSignedWrites?: boolean;
  reliableWrite?: boolean;
  writableAuxiliaries?: boolean;
};

type BluetoothRemoteGATTCharacteristicLike = {
  uuid: string;

  properties: BluetoothCharacteristicPropertiesLike;

  writeValueWithoutResponse?: (value: BufferSource) => Promise<void>;

  writeValueWithResponse?: (value: BufferSource) => Promise<void>;

  writeValue?: (value: BufferSource) => Promise<void>;
};

type BluetoothRemoteGATTServiceLike = {
  uuid: string;

  getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristicLike[]>;
};

type BluetoothRemoteGATTServerLike = {
  connected: boolean;

  connect(): Promise<BluetoothRemoteGATTServerLike>;

  disconnect?: () => void;

  getPrimaryServices(): Promise<BluetoothRemoteGATTServiceLike[]>;
};

type BluetoothDeviceLike = {
  id: string;

  name?: string;

  gatt?: BluetoothRemoteGATTServerLike;

  addEventListener(
    type: "gattserverdisconnected",
    listener: EventListener,
  ): void;

  removeEventListener(
    type: "gattserverdisconnected",
    listener: EventListener,
  ): void;
};

type BluetoothRequestDeviceOptionsLike = {
  filters?: Array<{
    name?: string;
    namePrefix?: string;
    services?: Array<string | number>;
  }>;

  optionalServices?: Array<string | number>;

  acceptAllDevices?: boolean;
};

type BluetoothApiLike = {
  requestDevice(
    options: BluetoothRequestDeviceOptionsLike,
  ): Promise<BluetoothDeviceLike>;

  getDevices?: () => Promise<BluetoothDeviceLike[]>;
};

type NavigatorWithBluetooth = Navigator & {
  bluetooth?: BluetoothApiLike;
};

export interface ThermalReceiptItem {
  name: string;
  qty: number;
  price: string;
  subtotal: string;
}

export interface ThermalReceiptData {
  storeName: string;

  address?: string;
  phone?: string;

  invoiceNumber: string;
  date: string;

  cashierName: string;
  customerName?: string;

  items: ThermalReceiptItem[];

  total: string;

  paymentMethod: string;

  amountPaid: string;
  change: string;

  footer?: string;
}

export interface BluetoothPrinterInfo {
  connected: boolean;

  deviceName: string | null;

  serviceUuid: string | null;

  characteristicUuid: string | null;
}

export interface ThermalPhotoPrintOptions {
  /**
   * Lebar gambar thermal dalam dot.
   *
   * Untuk RPP02N 58mm kita sengaja memakai
   * 360 dot, sedikit di bawah lebar maksimum
   * 384 dot. Ini memberi margin kecil dan
   * mengurangi beban head saat mencetak foto.
   */
  widthDots?: number;

  /**
   * Aktifkan proses dithering hitam-putih.
   */
  dither?: boolean;

  /**
   * Threshold hitam-putih 0-255.
   *
   * Lebih kecil = hasil lebih terang.
   * Lebih besar = hasil lebih gelap.
   */
  threshold?: number;

  /**
   * Atkinson lebih ringan dan cenderung lebih
   * halus untuk foto thermal kecil.
   */
  ditherAlgorithm?: "atkinson" | "floyd-steinberg" | "threshold";

  /**
   * Gamma correction.
   * Nilai < 1 membantu membuka mid-tone wajah.
   */
  gamma?: number;

  /**
   * Tambahan brightness dalam rentang kurang lebih
   * -255 sampai 255. Nilai positif membuat gambar
   * lebih terang.
   */
  brightness?: number;

  /**
   * Contrast multiplier.
   * 1 = normal.
   */
  contrast?: number;

  /**
   * Feed kertas setelah foto selesai.
   */
  feedLines?: number;
}

/**
 * ============================================
 * RONGTA BLE UUID
 * ============================================
 */

/**
 * Extension Rongta memprioritaskan FF02
 * sebagai write characteristic.
 */
const RONGTA_WRITE_CHARACTERISTIC = "0000ff02-0000-1000-8000-00805f9b34fb";

/**
 * Beberapa service BLE yang digunakan
 * berbagai firmware printer Rongta.
 */
const OPTIONAL_SERVICES: string[] = [
  "0000fee7-0000-1000-8000-00805f9b34fb",

  "000018f0-0000-1000-8000-00805f9b34fb",

  "0000ff00-0000-1000-8000-00805f9b34fb",

  "0000af30-0000-1000-8000-00805f9b34fb",
];

/**
 * ============================================
 * PRINTER CONFIG
 * ============================================
 */

const RECEIPT_WIDTH_58MM = 32;

const PHOTO_WIDTH_58MM = 360;

/**
 * Ukuran 100 byte pada implementasi sebelumnya terlalu agresif untuk
 * sebagian adapter/browser saat mengirim raster foto berukuran besar.
 *
 * Kita pakai chunk 20 byte sebagai nilai konservatif agar transfer lebih
 * stabil di lebih banyak kombinasi browser + adapter + firmware printer.
 */
const BLE_CHUNK_SIZE = 20;

/**
 * writeWithoutResponse tidak memberikan acknowledgement dari peripheral.
 * Beri jeda kecil agar receive buffer printer tidak dibanjiri ribuan packet
 * saat mencetak raster foto.
 */
const BLE_CHUNK_DELAY_WITHOUT_RESPONSE = 8;

/**
 * writeWithResponse sudah mempunyai flow-control dari GATT, jadi tidak perlu
 * jeda tambahan yang besar.
 */
const BLE_CHUNK_DELAY_WITH_RESPONSE = 1;

const ESC = 0x1b;

const GS = 0x1d;

const encoder = new TextEncoder();

/**
 * ============================================
 * ACTIVE CONNECTION
 * ============================================
 */

let activeDevice: BluetoothDeviceLike | null = null;

let activeServer: BluetoothRemoteGATTServerLike | null = null;

let activeWriteCharacteristic: BluetoothRemoteGATTCharacteristicLike | null =
  null;

let activeServiceUuid: string | null = null;

let disconnectHandler: EventListener | null = null;

/**
 * ============================================
 * WEB BLUETOOTH
 * ============================================
 */

function getBluetoothApi(): BluetoothApiLike {
  if (typeof navigator === "undefined") {
    throw new Error("Bluetooth printer hanya dapat digunakan melalui browser.");
  }

  const bluetooth = (navigator as NavigatorWithBluetooth).bluetooth;

  if (!bluetooth) {
    throw new Error(
      "Web Bluetooth tidak tersedia. Gunakan Google Chrome terbaru.",
    );
  }

  return bluetooth;
}

export function isBluetoothPrinterSupported() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return Boolean((navigator as NavigatorWithBluetooth).bluetooth);
}

/**
 * ============================================
 * GENERAL UTILITIES
 * ============================================
 */

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function cleanText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[^\x20-\x7e\n\r]/g, "");
}

function encode(value: string) {
  return encoder.encode(cleanText(value));
}

function concatBytes(...arrays: Uint8Array[]) {
  const totalLength = arrays.reduce(
    (total, current) => total + current.length,
    0,
  );

  const result = new Uint8Array(totalLength);

  let offset = 0;

  arrays.forEach((array) => {
    result.set(array, offset);

    offset += array.length;
  });

  return result;
}

function separator(width: number) {
  return "-".repeat(width);
}

function centerText(text: string, width: number) {
  const cleaned = cleanText(text);

  if (cleaned.length >= width) {
    return cleaned.slice(0, width);
  }

  const left = Math.floor((width - cleaned.length) / 2);

  return `${" ".repeat(left)}${cleaned}`;
}

function twoColumns(left: string, right: string, width: number) {
  const safeLeft = cleanText(left);

  const safeRight = cleanText(right);

  const available = width - safeRight.length - 1;

  if (available <= 0) {
    return `${safeLeft}\n${safeRight.padStart(width)}`;
  }

  if (safeLeft.length > available) {
    return `${safeLeft.slice(0, width)}\n${safeRight.padStart(width)}`;
  }

  const spaces = width - safeLeft.length - safeRight.length;

  return `${safeLeft}${" ".repeat(Math.max(spaces, 1))}${safeRight}`;
}

function wrapText(text: string, width: number) {
  const cleaned = cleanText(text);

  if (cleaned.length <= width) {
    return [cleaned];
  }

  const words = cleaned.split(/\s+/);

  const lines: string[] = [];

  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (candidate.length <= width) {
      current = candidate;

      continue;
    }

    if (current) {
      lines.push(current);
    }

    if (word.length > width) {
      for (let index = 0; index < word.length; index += width) {
        lines.push(word.slice(index, index + width));
      }

      current = "";
    } else {
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

/**
 * ============================================
 * CONNECTION STATE
 * ============================================
 */

function clearConnectionState() {
  activeServer = null;

  activeWriteCharacteristic = null;

  activeServiceUuid = null;
}

function clearAllConnectionState() {
  activeDevice = null;

  clearConnectionState();
}

function handleDisconnected() {
  clearConnectionState();
}

function removeDisconnectHandler() {
  if (activeDevice && disconnectHandler) {
    try {
      activeDevice.removeEventListener(
        "gattserverdisconnected",
        disconnectHandler,
      );
    } catch {
      // Abaikan.
    }
  }

  disconnectHandler = null;
}

function attachDisconnectHandler(device: BluetoothDeviceLike) {
  removeDisconnectHandler();

  disconnectHandler = handleDisconnected as EventListener;

  device.addEventListener("gattserverdisconnected", disconnectHandler);
}

/**
 * ============================================
 * GATT DISCOVERY
 * ============================================
 */

function canWriteCharacteristic(
  characteristic: BluetoothRemoteGATTCharacteristicLike,
) {
  return Boolean(
    characteristic.properties.writeWithoutResponse ||
    characteristic.properties.write,
  );
}

interface DiscoveredPrinterEndpoint {
  serviceUuid: string;

  characteristic: BluetoothRemoteGATTCharacteristicLike;
}

async function discoverWriteCharacteristic(
  server: BluetoothRemoteGATTServerLike,
): Promise<DiscoveredPrinterEndpoint> {
  const services = await server.getPrimaryServices();

  if (services.length === 0) {
    throw new Error(
      "Bluetooth terhubung tetapi service printer tidak ditemukan.",
    );
  }

  const candidates: Array<{
    serviceUuid: string;

    characteristic: BluetoothRemoteGATTCharacteristicLike;

    hasNotify: boolean;
  }> = [];

  /**
   * Rongta mencari service yang mempunyai:
   *
   * - writable characteristic
   * - notify characteristic
   */
  for (const service of services) {
    try {
      const characteristics = await service.getCharacteristics();

      const hasNotify = characteristics.some((characteristic) =>
        Boolean(characteristic.properties.notify),
      );

      for (const characteristic of characteristics) {
        if (canWriteCharacteristic(characteristic)) {
          candidates.push({
            serviceUuid: service.uuid,

            characteristic,

            hasNotify,
          });
        }
      }
    } catch (serviceError) {
      console.warn(
        `[RPP02N] Tidak dapat membaca service ${service.uuid}:`,
        serviceError,
      );
    }
  }

  if (candidates.length === 0) {
    throw new Error(
      "Writable Bluetooth characteristic RPP02N tidak ditemukan.",
    );
  }

  /**
   * Prioritas pertama:
   * FF02.
   */
  const ff02 = candidates.find(
    ({ characteristic }) =>
      characteristic.uuid.toLowerCase() === RONGTA_WRITE_CHARACTERISTIC,
  );

  if (ff02) {
    return {
      serviceUuid: ff02.serviceUuid,

      characteristic: ff02.characteristic,
    };
  }

  /**
   * Prioritas kedua:
   *
   * writable tanpa response
   * pada service yang juga
   * memiliki notify characteristic.
   */
  const writableWithNotify = candidates.find(
    (candidate) =>
      candidate.hasNotify &&
      Boolean(candidate.characteristic.properties.writeWithoutResponse),
  );

  if (writableWithNotify) {
    return {
      serviceUuid: writableWithNotify.serviceUuid,

      characteristic: writableWithNotify.characteristic,
    };
  }

  /**
   * Prioritas ketiga:
   * writeWithoutResponse.
   */
  const writableWithoutResponse = candidates.find(({ characteristic }) =>
    Boolean(characteristic.properties.writeWithoutResponse),
  );

  if (writableWithoutResponse) {
    return {
      serviceUuid: writableWithoutResponse.serviceUuid,

      characteristic: writableWithoutResponse.characteristic,
    };
  }

  /**
   * Fallback terakhir.
   */
  return {
    serviceUuid: candidates[0].serviceUuid,

    characteristic: candidates[0].characteristic,
  };
}

/**
 * ============================================
 * CONNECT DEVICE
 * ============================================
 */

async function connectDevice(device: BluetoothDeviceLike) {
  if (!device.gatt) {
    throw new Error("Perangkat ini tidak menyediakan Bluetooth GATT.");
  }

  let server = device.gatt;

  if (!server.connected) {
    server = await server.connect();
  }

  const endpoint = await discoverWriteCharacteristic(server);

  removeDisconnectHandler();

  activeDevice = device;

  activeServer = server;

  activeWriteCharacteristic = endpoint.characteristic;

  activeServiceUuid = endpoint.serviceUuid;

  attachDisconnectHandler(device);

  console.log("[RPP02N] Bluetooth printer ready:", {
    device: device.name,

    service: endpoint.serviceUuid,

    characteristic: endpoint.characteristic.uuid,

    properties: endpoint.characteristic.properties,
  });
}

/**
 * ============================================
 * CONNECT
 * ============================================
 */

export async function connectBluetoothPrinter() {
  const bluetooth = getBluetoothApi();

  /**
   * Kalau koneksi sebelumnya
   * masih terbuka, putuskan.
   */
  if (activeDevice?.gatt?.connected) {
    try {
      activeDevice.gatt.disconnect?.();
    } catch {
      // Abaikan.
    }
  }

  removeDisconnectHandler();

  clearAllConnectionState();

  let device: BluetoothDeviceLike;

  try {
    device = await bluetooth.requestDevice({
      filters: [
        {
          namePrefix: "RPP",
        },
      ],

      optionalServices: OPTIONAL_SERVICES,
    });
  } catch (requestError) {
    if (
      requestError instanceof DOMException &&
      requestError.name === "NotFoundError"
    ) {
      throw new Error(
        "Pemilihan printer dibatalkan atau RPP02N tidak dipilih.",
      );
    }

    throw requestError;
  }

  try {
    await connectDevice(device);
  } catch (connectionError) {
    clearAllConnectionState();

    if (connectionError instanceof Error) {
      throw connectionError;
    }

    throw new Error("Gagal menghubungkan RPP02N.");
  }
}

/**
 * ============================================
 * RESTORE PREVIOUS PRINTER
 * ============================================
 */

export async function restoreBluetoothPrinter() {
  const bluetooth = getBluetoothApi();

  if (!bluetooth.getDevices) {
    return false;
  }

  try {
    const devices = await bluetooth.getDevices();

    const printer =
      devices.find((device) => device.name?.toUpperCase().includes("RPP02N")) ??
      devices.find((device) => device.name?.toUpperCase().startsWith("RPP"));

    if (!printer) {
      return false;
    }

    await connectDevice(printer);

    return true;
  } catch (restoreError) {
    console.warn("[RPP02N] Restore printer gagal:", restoreError);

    clearAllConnectionState();

    return false;
  }
}

/**
 * ============================================
 * PRINTER INFO
 * ============================================
 */

export function getBluetoothPrinterInfo(): BluetoothPrinterInfo {
  return {
    connected: Boolean(
      activeDevice && activeServer?.connected && activeWriteCharacteristic,
    ),

    deviceName: activeDevice?.name ?? null,

    serviceUuid: activeServiceUuid,

    characteristicUuid: activeWriteCharacteristic?.uuid ?? null,
  };
}

export function isBluetoothPrinterConnected() {
  return getBluetoothPrinterInfo().connected;
}

/**
 * ============================================
 * BLE WRITE
 * ============================================
 */

function getWriteCharacteristic() {
  if (!activeDevice || !activeServer?.connected || !activeWriteCharacteristic) {
    clearConnectionState();

    throw new Error(
      "RPP02N belum terhubung. Hubungkan printer terlebih dahulu.",
    );
  }

  return activeWriteCharacteristic;
}

async function writeCharacteristic(
  characteristic: BluetoothRemoteGATTCharacteristicLike,

  data: Uint8Array,
) {
  const copy = new Uint8Array(data);

  const buffer = copy.buffer.slice(
    copy.byteOffset,
    copy.byteOffset + copy.byteLength,
  ) as ArrayBuffer;

  /**
   * PENTING:
   *
   * Jangan hanya mengecek apakah method tersedia.
   *
   * Pada object Web Bluetooth, method bisa tersedia walaupun characteristic
   * tidak mengiklankan mode write tersebut. Implementasi sebelumnya selalu
   * mencoba writeValueWithoutResponse lebih dulu dan dapat menghasilkan
   * NotSupportedError/GATT operation failed.
   */

  if (
    characteristic.properties.write &&
    characteristic.writeValueWithResponse
  ) {
    await characteristic.writeValueWithResponse(buffer);

    return "with-response" as const;
  }

  if (
    characteristic.properties.writeWithoutResponse &&
    characteristic.writeValueWithoutResponse
  ) {
    await characteristic.writeValueWithoutResponse(buffer);

    return "without-response" as const;
  }

  /**
   * Fallback untuk Chromium lama.
   */
  if (
    (characteristic.properties.write ||
      characteristic.properties.writeWithoutResponse) &&
    characteristic.writeValue
  ) {
    await characteristic.writeValue(buffer);

    return "legacy" as const;
  }

  throw new Error(
    "Characteristic RPP02N ditemukan, tetapi tidak menyediakan mode write yang dapat digunakan browser.",
  );
}

async function writeToPrinter(data: Uint8Array) {
  const characteristic = getWriteCharacteristic();

  try {
    for (let offset = 0; offset < data.length; offset += BLE_CHUNK_SIZE) {
      if (!activeServer?.connected) {
        throw new Error("Koneksi Bluetooth printer terputus.");
      }

      const chunk = data.slice(offset, offset + BLE_CHUNK_SIZE);

      const writeMode = await writeCharacteristic(characteristic, chunk);

      /**
       * Pacing hanya untuk menjaga receive buffer printer tetap stabil.
       *
       * Foto 58 mm dapat berisi puluhan ribu byte, jadi tanpa pacing
       * writeWithoutResponse bisa memenuhi buffer printer jauh lebih cepat
       * daripada printer memproses raster.
       */
      if (writeMode === "without-response") {
        await delay(BLE_CHUNK_DELAY_WITHOUT_RESPONSE);
      } else if (writeMode === "with-response") {
        await delay(BLE_CHUNK_DELAY_WITH_RESPONSE);
      }
    }
  } catch (writeError) {
    if (!activeServer?.connected) {
      clearConnectionState();

      throw new Error(
        "Koneksi Bluetooth RPP02N terputus saat data sedang dikirim. Hubungkan ulang printer dan coba lagi.",
      );
    }

    if (writeError instanceof DOMException) {
      throw new Error(
        `Bluetooth RPP02N gagal menerima data (${writeError.name}). Putuskan lalu hubungkan kembali printer, kemudian jalankan Tes Printer sebelum mencetak foto.`,
      );
    }

    if (writeError instanceof Error) {
      throw writeError;
    }

    throw new Error("Gagal mengirim data ke RPP02N.");
  }
}

/**
 * ============================================
 * TEST PRINTER
 * ============================================
 */

export async function testBluetoothPrinter() {
  const data = concatBytes(
    /**
     * Initialize.
     */
    Uint8Array.from([ESC, 0x40]),

    /**
     * Center.
     */
    Uint8Array.from([ESC, 0x61, 0x01]),

    /**
     * Bold ON.
     */
    Uint8Array.from([ESC, 0x45, 0x01]),

    encode("TEST PRINTER\n"),

    /**
     * Bold OFF.
     */
    Uint8Array.from([ESC, 0x45, 0x00]),

    encode("RPP02N BLE TERHUBUNG\n"),

    encode(`${separator(RECEIPT_WIDTH_58MM)}\n`),

    encode("Printer siap digunakan\n"),

    /**
     * Feed.
     */
    Uint8Array.from([ESC, 0x64, 0x04]),

    /**
     * Reset alignment.
     */
    Uint8Array.from([ESC, 0x61, 0x00]),
  );

  await writeToPrinter(data);
}

/**
 * ============================================
 * PHOTO LOADER
 * ============================================
 */

async function loadPhotoImageData(imageUrl: string, requestedWidth: number) {
  const response = await fetch(imageUrl, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Gagal mengambil foto dari Cloudinary.");
  }

  const blob = await response.blob();

  const bitmap = await createImageBitmap(blob);

  try {
    /**
     * ESC/POS raster bekerja
     * per 8 horizontal pixel.
     *
     * Jadi lebarnya harus
     * kelipatan 8.
     */
    const width = Math.max(8, Math.floor(requestedWidth / 8) * 8);

    const ratio = width / bitmap.width;

    const height = Math.max(1, Math.round(bitmap.height * ratio));

    const canvas = document.createElement("canvas");

    canvas.width = width;

    canvas.height = height;

    const context = canvas.getContext("2d", {
      willReadFrequently: true,
    });

    if (!context) {
      throw new Error("Canvas browser tidak tersedia.");
    }

    /**
     * Background putih.
     */
    context.fillStyle = "#ffffff";

    context.fillRect(0, 0, width, height);

    /**
     * Gunakan smoothing saat resize
     * supaya wajah tidak terlalu kasar.
     */
    context.imageSmoothingEnabled = true;

    context.imageSmoothingQuality = "high";

    context.drawImage(bitmap, 0, 0, width, height);

    const imageData = context.getImageData(0, 0, width, height);

    return {
      width,

      height,

      data: imageData.data,
    };
  } finally {
    bitmap.close();
  }
}

/**
 * ============================================
 * PHOTO PRE-PROCESSING
 * ============================================
 */

function clampByte(value: number) {
  return Math.max(0, Math.min(255, value));
}

function createProcessedGrayscale(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  brightness: number,
  contrast: number,
  gamma: number,
) {
  const grayscale = new Float32Array(width * height);

  let minLuminance = 255;
  let maxLuminance = 0;

  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const rgbaIndex = pixel * 4;

    const alpha = rgba[rgbaIndex + 3] / 255;

    const red = 255 + (rgba[rgbaIndex] - 255) * alpha;
    const green = 255 + (rgba[rgbaIndex + 1] - 255) * alpha;
    const blue = 255 + (rgba[rgbaIndex + 2] - 255) * alpha;

    const luminance = red * 0.299 + green * 0.587 + blue * 0.114;

    grayscale[pixel] = luminance;

    if (luminance < minLuminance) {
      minLuminance = luminance;
    }

    if (luminance > maxLuminance) {
      maxLuminance = luminance;
    }
  }

  /**
   * Auto-level ringan.
   *
   * Foto photobooth sering punya dynamic range sempit.
   * Normalisasi ini membuat detail wajah lebih mudah
   * diterjemahkan ke 1-bit thermal.
   */
  const luminanceRange = Math.max(1, maxLuminance - minLuminance);

  for (let index = 0; index < grayscale.length; index += 1) {
    let value = ((grayscale[index] - minLuminance) / luminanceRange) * 255;

    value = (value - 128) * contrast + 128 + brightness;
    value = clampByte(value);

    /**
     * gamma < 1 membuka mid-tone sehingga area kulit
     * tidak berubah menjadi blok hitam besar.
     */
    value = 255 * Math.pow(value / 255, gamma);

    grayscale[index] = clampByte(value);
  }

  return grayscale;
}

/**
 * ============================================
 * MONOCHROME BITMAP
 * ============================================
 */

function createMonochromeBitmap(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  threshold: number,
  useDither: boolean,
  ditherAlgorithm: "atkinson" | "floyd-steinberg" | "threshold",
  brightness: number,
  contrast: number,
  gamma: number,
) {
  const grayscale = createProcessedGrayscale(
    rgba,
    width,
    height,
    brightness,
    contrast,
    gamma,
  );

  const blackPixels = new Uint8Array(width * height);

  if (!useDither || ditherAlgorithm === "threshold") {
    for (let index = 0; index < grayscale.length; index += 1) {
      blackPixels[index] = grayscale[index] < threshold ? 1 : 0;
    }

    return blackPixels;
  }

  /**
   * ========================================
   * ATKINSON DITHERING
   * ========================================
   *
   * Dibanding Floyd-Steinberg, Atkinson hanya
   * menyebarkan sebagian error. Hasilnya cenderung
   * lebih terang dan lebih bersih untuk thermal.
   */
  if (ditherAlgorithm === "atkinson") {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;

        const oldPixel = grayscale[index];
        const newPixel = oldPixel < threshold ? 0 : 255;

        blackPixels[index] = newPixel === 0 ? 1 : 0;

        const error = (oldPixel - newPixel) / 8;

        if (x + 1 < width) {
          grayscale[index + 1] += error;
        }

        if (x + 2 < width) {
          grayscale[index + 2] += error;
        }

        if (y + 1 < height) {
          if (x > 0) {
            grayscale[index + width - 1] += error;
          }

          grayscale[index + width] += error;

          if (x + 1 < width) {
            grayscale[index + width + 1] += error;
          }
        }

        if (y + 2 < height) {
          grayscale[index + width * 2] += error;
        }
      }
    }

    return blackPixels;
  }

  /**
   * ========================================
   * FLOYD-STEINBERG
   * ========================================
   *
   * Tetap tersedia sebagai opsi jika suatu saat
   * detail tertentu lebih bagus memakai algoritma ini.
   */
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;

      const oldPixel = grayscale[index];
      const newPixel = oldPixel < threshold ? 0 : 255;

      blackPixels[index] = newPixel === 0 ? 1 : 0;

      const error = oldPixel - newPixel;

      if (x + 1 < width) {
        grayscale[index + 1] += error * (7 / 16);
      }

      if (y + 1 < height) {
        if (x > 0) {
          grayscale[index + width - 1] += error * (3 / 16);
        }

        grayscale[index + width] += error * (5 / 16);

        if (x + 1 < width) {
          grayscale[index + width + 1] += error * (1 / 16);
        }
      }
    }
  }

  return blackPixels;
}

/**
 * ============================================
 * ESC * 24-DOT PHOTO STREAM
 * ============================================
 *
 * RPP02N tertentu menghasilkan banding ketika foto
 * tinggi dikirim sebagai satu GS v 0 raster besar.
 *
 * Mode ESC * 33 mencetak gambar sebagai strip 24-dot.
 * Yang penting, setiap strip memiliki line spacing yang
 * tepat 24-dot sehingga tidak ada celah tambahan di
 * antara strip.
 */

function buildEscStarPhotoStream(
  blackPixels: Uint8Array,
  width: number,
  height: number,
  feedLines: number,
) {
  const commands: Uint8Array[] = [];

  /**
   * Initialize printer.
   */
  commands.push(Uint8Array.from([ESC, 0x40]));

  /**
   * Center image.
   */
  commands.push(Uint8Array.from([ESC, 0x61, 0x01]));

  /**
   * Set line spacing = 24 vertical dots.
   */
  commands.push(Uint8Array.from([ESC, 0x33, 24]));

  const nLow = width & 0xff;
  const nHigh = (width >> 8) & 0xff;

  for (let offsetY = 0; offsetY < height; offsetY += 24) {
    /**
     * ESC * 33 nL nH
     * + width * 3 bytes
     * + LF
     */
    const band = new Uint8Array(5 + width * 3 + 1);

    band[0] = ESC;
    band[1] = 0x2a;
    band[2] = 33;
    band[3] = nLow;
    band[4] = nHigh;

    let pointer = 5;

    for (let x = 0; x < width; x += 1) {
      for (let byteGroup = 0; byteGroup < 3; byteGroup += 1) {
        let outputByte = 0;

        for (let bit = 0; bit < 8; bit += 1) {
          const y = offsetY + byteGroup * 8 + bit;

          if (y >= height) {
            continue;
          }

          const pixelIndex = y * width + x;

          if (blackPixels[pixelIndex] === 1) {
            outputByte |= 0x80 >> bit;
          }
        }

        band[pointer] = outputByte;
        pointer += 1;
      }
    }

    /**
     * LF menjalankan kertas tepat sebesar line spacing
     * yang sudah diset 24-dot.
     */
    band[pointer] = 0x0a;

    commands.push(band);
  }

  /**
   * Restore default line spacing.
   */
  commands.push(Uint8Array.from([ESC, 0x32]));

  if (feedLines > 0) {
    commands.push(Uint8Array.from([ESC, 0x64, feedLines]));
  }

  /**
   * Restore left alignment.
   */
  commands.push(Uint8Array.from([ESC, 0x61, 0x00]));

  return concatBytes(...commands);
}

/**
 * ============================================
 * PRINT PHOTO
 * ============================================
 */

export async function printBluetoothPhoto(
  imageUrl: string,
  options: ThermalPhotoPrintOptions = {},
) {
  if (!isBluetoothPrinterConnected()) {
    throw new Error(
      "RPP02N belum terhubung. Hubungkan printer terlebih dahulu.",
    );
  }

  /**
   * Sedikit lebih kecil dari 384-dot maksimum.
   * Memberi margin dan mengurangi density/power load
   * pada satu horizontal line.
   */
  const requestedWidth = options.widthDots ?? PHOTO_WIDTH_58MM;
  const widthDots = Math.min(360, Math.max(8, requestedWidth));

  const threshold = Math.min(255, Math.max(0, options.threshold ?? 122));

  const useDither = options.dither ?? true;

  const ditherAlgorithm = options.ditherAlgorithm ?? "atkinson";

  const gamma = Math.max(0.1, options.gamma ?? 0.92);

  const brightness = Math.max(-255, Math.min(255, options.brightness ?? 10));

  const contrast = Math.max(0.1, options.contrast ?? 1.08);

  const feedLines = Math.min(255, Math.max(0, options.feedLines ?? 4));

  const image = await loadPhotoImageData(imageUrl, widthDots);

  const blackPixels = createMonochromeBitmap(
    image.data,
    image.width,
    image.height,
    threshold,
    useDither,
    ditherAlgorithm,
    brightness,
    contrast,
    gamma,
  );

  const printStream = buildEscStarPhotoStream(
    blackPixels,
    image.width,
    image.height,
    feedLines,
  );

  await writeToPrinter(printStream);
}

/**
 * ============================================
 * RECEIPT BUILDER
 * ============================================
 */

function buildReceipt(
  receipt: ThermalReceiptData,

  paperWidth: 58 | 80,
) {
  const width = paperWidth === 80 ? 48 : RECEIPT_WIDTH_58MM;

  const commands: Uint8Array[] = [];

  /**
   * Initialize.
   */
  commands.push(Uint8Array.from([ESC, 0x40]));

  /**
   * Center.
   */
  commands.push(Uint8Array.from([ESC, 0x61, 0x01]));

  /**
   * Bold ON.
   */
  commands.push(Uint8Array.from([ESC, 0x45, 0x01]));

  commands.push(encode(`${centerText(receipt.storeName, width)}\n`));

  /**
   * Bold OFF.
   */
  commands.push(Uint8Array.from([ESC, 0x45, 0x00]));

  if (receipt.address) {
    wrapText(receipt.address, width).forEach((line) => {
      commands.push(encode(`${centerText(line, width)}\n`));
    });
  }

  if (receipt.phone) {
    commands.push(encode(`${centerText(receipt.phone, width)}\n`));
  }

  commands.push(encode(`${separator(width)}\n`));

  /**
   * Left align.
   */
  commands.push(Uint8Array.from([ESC, 0x61, 0x00]));

  /**
   * Transaction info.
   */
  commands.push(
    encode(`${twoColumns("No. Invoice", receipt.invoiceNumber, width)}\n`),
  );

  commands.push(encode(`${twoColumns("Tanggal", receipt.date, width)}\n`));

  commands.push(encode(`${twoColumns("Kasir", receipt.cashierName, width)}\n`));

  if (receipt.customerName) {
    commands.push(
      encode(`${twoColumns("Pelanggan", receipt.customerName, width)}\n`),
    );
  }

  commands.push(encode(`${separator(width)}\n`));

  /**
   * Items.
   */
  receipt.items.forEach((item) => {
    wrapText(item.name, width).forEach((line) => {
      commands.push(encode(`${line}\n`));
    });

    const quantityInfo = `${item.qty} x ${item.price}`;

    commands.push(
      encode(`${twoColumns(quantityInfo, item.subtotal, width)}\n`),
    );
  });

  commands.push(encode(`${separator(width)}\n`));

  /**
   * Total.
   */
  commands.push(Uint8Array.from([ESC, 0x45, 0x01]));

  commands.push(encode(`${twoColumns("TOTAL", receipt.total, width)}\n`));

  commands.push(Uint8Array.from([ESC, 0x45, 0x00]));

  commands.push(
    encode(`${twoColumns(receipt.paymentMethod, receipt.amountPaid, width)}\n`),
  );

  commands.push(encode(`${twoColumns("Kembalian", receipt.change, width)}\n`));

  commands.push(encode(`${separator(width)}\n`));

  /**
   * Footer.
   */
  commands.push(Uint8Array.from([ESC, 0x61, 0x01]));

  const footer = receipt.footer ?? "Terima kasih atas kunjungan Anda";

  wrapText(footer, width).forEach((line) => {
    commands.push(encode(`${centerText(line, width)}\n`));
  });

  /**
   * Feed paper.
   */
  commands.push(Uint8Array.from([ESC, 0x64, 0x04]));

  /**
   * Reset alignment.
   */
  commands.push(Uint8Array.from([ESC, 0x61, 0x00]));

  /**
   * Reset character size.
   */
  commands.push(Uint8Array.from([GS, 0x21, 0x00]));

  return concatBytes(...commands);
}

/**
 * ============================================
 * PRINT RECEIPT
 * ============================================
 */

export async function printBluetoothReceipt(
  receipt: ThermalReceiptData,

  paperWidth: 58 | 80 = 58,
) {
  if (!isBluetoothPrinterConnected()) {
    throw new Error(
      "RPP02N belum terhubung. Hubungkan printer terlebih dahulu.",
    );
  }

  try {
    const data = buildReceipt(receipt, paperWidth);

    await writeToPrinter(data);
  } catch (printError) {
    console.error("[RPP02N] Receipt print error:", printError);

    if (printError instanceof Error) {
      throw printError;
    }

    throw new Error("Gagal mencetak struk.");
  }
}

/**
 * ============================================
 * DISCONNECT
 * ============================================
 */

export async function disconnectBluetoothPrinter() {
  removeDisconnectHandler();

  if (activeDevice?.gatt?.connected) {
    try {
      activeDevice.gatt.disconnect?.();
    } catch (disconnectError) {
      console.warn("[RPP02N] Disconnect error:", disconnectError);
    }
  }

  clearAllConnectionState();
}
