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
   * Lebar print RPP02N 58mm.
   *
   * Default:
   * 384 dots.
   */
  widthDots?: number;

  /**
   * Mengaktifkan Floyd-Steinberg dithering.
   *
   * Sangat direkomendasikan untuk foto.
   */
  dither?: boolean;

  /**
   * Threshold grayscale.
   *
   * Lebih rendah:
   * hasil lebih terang.
   *
   * Lebih tinggi:
   * hasil lebih gelap.
   *
   * Default:
   * 128
   */
  threshold?: number;

  /**
   * Jumlah feed line setelah foto.
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

const PHOTO_WIDTH_58MM = 384;

/**
 * PENTING:
 *
 * Dari extension Rongta:
 *
 * mobile printer + paper < 62mm
 * menggunakan MTU/chunk 100 byte.
 */
const BLE_CHUNK_SIZE = 100;

/**
 * Extension Rongta mengirim mobile printer
 * tanpa artificial delay.
 *
 * Jangan beri delay 20ms seperti implementasi lama
 * karena dapat membuat motor thermal berhenti-jalan
 * dan menghasilkan horizontal banding.
 */
const BLE_CHUNK_DELAY = 0;

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
    characteristic.properties.write ||
    characteristic.properties.writableAuxiliaries,
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
  /**
   * Pastikan browser menerima ArrayBuffer biasa.
   */
  const copy = new Uint8Array(data);

  const buffer = copy.buffer.slice(
    copy.byteOffset,
    copy.byteOffset + copy.byteLength,
  ) as ArrayBuffer;

  /**
   * Rongta menggunakan
   * writeValueWithoutResponse.
   */
  if (characteristic.writeValueWithoutResponse) {
    await characteristic.writeValueWithoutResponse(buffer);

    return;
  }

  if (characteristic.writeValueWithResponse) {
    await characteristic.writeValueWithResponse(buffer);

    return;
  }

  if (characteristic.writeValue) {
    await characteristic.writeValue(buffer);

    return;
  }

  throw new Error(
    "Bluetooth characteristic RPP02N tidak mendukung operasi write.",
  );
}

async function writeToPrinter(data: Uint8Array) {
  const characteristic = getWriteCharacteristic();

  try {
    /**
     * PENTING:
     *
     * Data ESC/POS tetap utuh secara logical.
     *
     * Yang dipecah di sini HANYA
     * transport BLE menjadi packet
     * 100 byte.
     */
    for (let offset = 0; offset < data.length; offset += BLE_CHUNK_SIZE) {
      if (!activeServer?.connected) {
        throw new Error("Koneksi Bluetooth printer terputus.");
      }

      const chunk = data.slice(offset, offset + BLE_CHUNK_SIZE);

      await writeCharacteristic(characteristic, chunk);

      /**
       * Untuk RPP02N 58mm:
       *
       * extension Rongta memakai
       * delay 0.
       */
      if (BLE_CHUNK_DELAY > 0) {
        await delay(BLE_CHUNK_DELAY);
      }
    }
  } catch (writeError) {
    if (!activeServer?.connected) {
      clearConnectionState();

      throw new Error("Koneksi Bluetooth RPP02N terputus.");
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
 * GRAYSCALE + DITHERING
 * ============================================
 */

function createMonochromeRaster(
  rgba: Uint8ClampedArray,

  width: number,

  height: number,

  threshold: number,

  useDither: boolean,
) {
  const grayscale = new Float32Array(width * height);

  /**
   * RGB -> luminance.
   */
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const rgbaIndex = pixel * 4;

    const alpha = rgba[rgbaIndex + 3] / 255;

    /**
     * Blend transparent area
     * dengan putih.
     */
    const red = 255 + (rgba[rgbaIndex] - 255) * alpha;

    const green = 255 + (rgba[rgbaIndex + 1] - 255) * alpha;

    const blue = 255 + (rgba[rgbaIndex + 2] - 255) * alpha;

    grayscale[pixel] = red * 0.299 + green * 0.587 + blue * 0.114;
  }

  const blackPixels = new Uint8Array(width * height);

  /**
   * ========================================
   * FLOYD-STEINBERG DITHERING
   * ========================================
   */
  if (useDither) {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;

        const oldPixel = grayscale[index];

        const newPixel = oldPixel < threshold ? 0 : 255;

        blackPixels[index] = newPixel === 0 ? 1 : 0;

        const error = oldPixel - newPixel;

        /**
         * Right.
         */
        if (x + 1 < width) {
          grayscale[index + 1] += error * (7 / 16);
        }

        /**
         * Bottom.
         */
        if (y + 1 < height) {
          /**
           * Bottom-left.
           */
          if (x > 0) {
            grayscale[index + width - 1] += error * (3 / 16);
          }

          /**
           * Bottom.
           */
          grayscale[index + width] += error * (5 / 16);

          /**
           * Bottom-right.
           */
          if (x + 1 < width) {
            grayscale[index + width + 1] += error * (1 / 16);
          }
        }
      }
    }
  } else {
    /**
     * Simple threshold.
     */
    for (let index = 0; index < grayscale.length; index += 1) {
      blackPixels[index] = grayscale[index] < threshold ? 1 : 0;
    }
  }

  /**
   * ========================================
   * 1-BIT RASTER
   * ========================================
   */

  const widthBytes = Math.ceil(width / 8);

  const raster = new Uint8Array(widthBytes * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = y * width + x;

      if (blackPixels[pixelIndex] === 0) {
        continue;
      }

      const byteIndex = y * widthBytes + Math.floor(x / 8);

      const bit = 7 - (x % 8);

      raster[byteIndex] |= 1 << bit;
    }
  }

  return {
    raster,

    widthBytes,
  };
}

/**
 * ============================================
 * ESC/POS RASTER HEADER
 * ============================================
 *
 * GS v 0
 *
 * xL xH = width byte
 * yL yH = height pixel
 */

function createRasterHeader(
  widthBytes: number,

  height: number,
) {
  const xLow = widthBytes & 0xff;

  const xHigh = (widthBytes >> 8) & 0xff;

  const yLow = height & 0xff;

  const yHigh = (height >> 8) & 0xff;

  return Uint8Array.from([GS, 0x76, 0x30, 0x00, xLow, xHigh, yLow, yHigh]);
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

  const widthDots = options.widthDots ?? PHOTO_WIDTH_58MM;

  /**
   * Sebelumnya 145.
   *
   * 128 membuat hasil sedikit
   * lebih terang sehingga wajah
   * tidak terlalu hitam.
   */
  const threshold = Math.min(255, Math.max(0, options.threshold ?? 128));

  const useDither = options.dither ?? true;

  const feedLines = Math.min(255, Math.max(0, options.feedLines ?? 4));

  /**
   * ========================================
   * LOAD IMAGE
   * ========================================
   */

  const image = await loadPhotoImageData(imageUrl, widthDots);

  /**
   * ========================================
   * CONVERT IMAGE
   * ========================================
   */

  const { raster, widthBytes } = createMonochromeRaster(
    image.data,
    image.width,
    image.height,
    threshold,
    useDither,
  );

  /**
   * ========================================
   * IMPORTANT FIX
   * ========================================
   *
   * Versi sebelumnya melakukan:
   *
   * GS v 0
   * 96 row
   *
   * GS v 0
   * 96 row
   *
   * GS v 0
   * 96 row
   *
   * Akibatnya setiap command baru dapat
   * menyebabkan motor printer bergerak
   * sedikit dan foto terlihat patah.
   *
   * Sekarang:
   *
   * SATU GS v 0
   * + SATU FOTO UTUH.
   *
   * Yang dipecah hanyalah packet BLE.
   */

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
   * ONE COMPLETE IMAGE.
   */
  commands.push(createRasterHeader(widthBytes, image.height));

  commands.push(raster);

  /**
   * Feed paper.
   */
  if (feedLines > 0) {
    commands.push(Uint8Array.from([ESC, 0x64, feedLines]));
  }

  /**
   * Reset alignment.
   */
  commands.push(Uint8Array.from([ESC, 0x61, 0x00]));

  const printStream = concatBytes(...commands);

  /**
   * SATU kali writeToPrinter().
   *
   * Tidak ada pause antar
   * bagian raster gambar.
   */
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
