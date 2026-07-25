from __future__ import annotations

import socket
from typing import Any

try:
    from zeroconf import IPVersion, ServiceInfo, Zeroconf
except ImportError:  # O servidor continua funcionando mesmo sem o anúncio mDNS.
    IPVersion = ServiceInfo = Zeroconf = None  # type: ignore[assignment]


class MdnsAnnouncer:
    def __init__(self, port: int = 8000):
        self.port = port
        self.zeroconf: Any = None
        self.info: Any = None

    @staticmethod
    def _local_ipv4() -> str:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            sock.connect(("8.8.8.8", 80))
            return sock.getsockname()[0]
        except OSError:
            return "127.0.0.1"
        finally:
            sock.close()

    def start(self) -> None:
        if Zeroconf is None:
            print("[mDNS] Biblioteca zeroconf não instalada; use o IP do computador.")
            return
        try:
            address = socket.inet_aton(self._local_ipv4())
            self.zeroconf = Zeroconf(ip_version=IPVersion.V4Only)
            self.info = ServiceInfo(
                "_http._tcp.local.",
                "Smart Finance._http._tcp.local.",
                addresses=[address],
                port=self.port,
                properties={b"path": b"/"},
                server="smartfinance.local.",
            )
            self.zeroconf.register_service(self.info)
            print(f"[mDNS] Anunciado em http://smartfinance.local:{self.port}")
        except Exception as exc:
            print(f"[mDNS] Não foi possível anunciar smartfinance.local: {exc}")

    def stop(self) -> None:
        if self.zeroconf and self.info:
            try:
                self.zeroconf.unregister_service(self.info)
            except Exception:
                pass
            self.zeroconf.close()
