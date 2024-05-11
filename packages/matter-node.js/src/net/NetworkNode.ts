/**
 * @license
 * Copyright 2022-2024 Matter.js Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Logger } from "@project-chip/matter.js/log";
import {
    InterfaceType,
    Network,
    NetworkError,
    NetworkInterface,
    NetworkInterfaceDetails,
    NetworkInterfaceNameToTypeMapping,
    UdpChannel,
    UdpChannelOptions,
} from "@project-chip/matter.js/net";
import { Cache, isIPv6, onSameNetwork } from "@project-chip/matter.js/util";
import { NetworkInterfaceInfo, networkInterfaces } from "os";
import { UdpChannelNode } from "./UdpChannelNode.js";

const logger = Logger.get("NetworkNode");

export class NetworkNode extends Network {
    static getMulticastInterfaceIpv4(netInterface: string): string | undefined {
        const netInterfaceInfo = networkInterfaces()[netInterface];
        if (netInterfaceInfo === undefined) throw new NetworkError(`Unknown interface: ${netInterface}`);
        for (const { address, family } of netInterfaceInfo) {
            if (family === "IPv4") {
                return address;
            }
        }
        return undefined;
    }

    static getMembershipMulticastInterfaces(netInterface: string | undefined, ipv4: boolean): (string | undefined)[] {
        if (ipv4) {
            return [undefined];
        } else {
            let networkInterfaceEntries = Object.entries(networkInterfaces());
            if (netInterface !== undefined) {
                networkInterfaceEntries = networkInterfaceEntries.filter(([name]) => name === netInterface);
            }
            const multicastInterfaces = networkInterfaceEntries.flatMap(([netInterface, netInterfaceInfo]) => {
                if (netInterfaceInfo === undefined) return [];
                const zone = this.getNetInterfaceZoneIpv6Internal(netInterface, netInterfaceInfo);
                return zone === undefined ? [] : [`::%${zone}`];
            });
            if (multicastInterfaces.length === 0) {
                logger.warn(
                    `No IPv6 multicast interface found${
                        netInterface !== undefined ? ` for interface ${netInterface}` : ""
                    }.`,
                );
            }
            return multicastInterfaces;
        }
    }

    static getNetInterfaceZoneIpv6(netInterface: string): string | undefined {
        const netInterfaceInfo = networkInterfaces()[netInterface];
        if (netInterfaceInfo === undefined) throw new NetworkError(`Unknown interface: ${netInterface}`);
        return this.getNetInterfaceZoneIpv6Internal(netInterface, netInterfaceInfo);
    }

    static getNetInterfaceForIp(ip: string) {
        // Finding the local interface on the same interface is complex and won't change
        // So let's cache the results for 5mn
        return this.netInterfaces.get(ip);
    }

    private static readonly netInterfaces = new Cache<string | undefined>(
        "Network interface",
        (ip: string) => this.getNetInterfaceForRemoveAddress(ip),
        5 * 60 * 1000 /* 5mn */,
    );

    override async close() {
        await NetworkNode.netInterfaces.close();
    }

    private static getNetInterfaceForRemoveAddress(ip: string) {
        if (ip.includes("%")) {
            // IPv6 address with scope
            return ip.split("%")[1];
        } else {
            const interfaces = networkInterfaces();
            for (const name in interfaces) {
                const netInterfaces = interfaces[name] as NetworkInterfaceInfo[];
                for (const { address, netmask } of netInterfaces) {
                    if (onSameNetwork(ip, address, netmask)) {
                        return this.getNetInterfaceZoneIpv6Internal(name, netInterfaces);
                    }
                }
            }
            if (isIPv6(ip)) {
                if (ip.startsWith("fd")) {
                    // IPv6 address is an ULA
                    return ""; // consider it as being ok and using the "Default interface"
                }
            }
            return undefined;
        }
    }

    private static getNetInterfaceZoneIpv6Internal(
        netInterface: string,
        netInterfaceInfos: NetworkInterfaceInfo[] | undefined,
    ): string | undefined {
        if (process.platform !== "win32") {
            return netInterface;
        }
        if (netInterfaceInfos === undefined) return undefined;
        return netInterfaceInfos
            .find(({ address, family }) => family === "IPv6" && address.startsWith("fe80::"))
            ?.scopeid?.toString();
    }

    /**
     * Get all network interfaces.
     * The optional nameTypeMapping parameter allows to map interface names to types if this mapping is known.
     *
     * @param nameTypeMapping - An array of objects with the name and type properties.
     */
    getNetInterfaces(nameTypeMapping: NetworkInterfaceNameToTypeMapping = []): NetworkInterface[] {
        const result = new Array<NetworkInterface>();
        const interfaces = networkInterfaces();
        for (const name in interfaces) {
            const netInterfaces = interfaces[name] as NetworkInterfaceInfo[];
            if (netInterfaces.length === 0) continue;
            if (netInterfaces[0].internal) continue;
            let type = InterfaceType.Unspecified;
            if (nameTypeMapping.length > 0) {
                const nameType = nameTypeMapping.find(({ name: mapName }) => name === mapName);
                if (nameType !== undefined) {
                    type = nameType.type;
                }
            }
            result.push({ name, type });
        }
        return result;
    }

    getIpMac(netInterface: string): NetworkInterfaceDetails | undefined {
        const netInterfaceInfo = networkInterfaces()[netInterface];
        if (netInterfaceInfo === undefined) return undefined;
        const ipV4 = netInterfaceInfo.filter(({ family }) => family === "IPv4").map(({ address }) => address);
        const ipV6 = netInterfaceInfo.filter(({ family }) => family === "IPv6").map(({ address }) => address);
        return { mac: netInterfaceInfo[0].mac, ipV4, ipV6 };
    }

    override createUdpChannel(options: UdpChannelOptions): Promise<UdpChannel> {
        return UdpChannelNode.create(options);
    }
}
