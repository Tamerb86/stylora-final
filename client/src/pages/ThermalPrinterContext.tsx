import { toast } from "sonner";
import { generateReceiptESCPOS, generateTestReceiptESCPOS } from "@/utils/escpos";

// Type declarations for WebUSB and Web Serial API
declare global {
  interface Navigator {
    usb: USB;
    serial: Serial;
  }
}

interface USB {
  requestDevice(options?: USBDeviceRequestOptions): Promise<USBDevice>;
}

interface USBDeviceRequestOptions {
  filters: Array<{ vendorId: number }>;
}

interface USBDevice {
  vendorId: number;
  productId: number;
  productName?: string;
  configuration: USBConfiguration | null;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
}

interface USBConfiguration {
  interfaces: USBInterface[];
}

interface USBInterface {
  alternate: USBAlternateInterface;
}

interface USBAlternateInterface {
  endpoints: USBEndpoint[];
}

interface USBEndpoint {
  endpointNumber: number;
  direction: "in" | "out";
}

interface USBOutTransferResult {