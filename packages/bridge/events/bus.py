"""Minimal event bus adapter for Bridge.

This keeps the interface aligned with the Node event bus and can be swapped
for Redis Streams or another broker later.
"""

from typing import Callable, Dict, List


class EventBus:
    def __init__(self):
        self._handlers: Dict[str, List[Callable]] = {}

    def publish(self, topic: str, payload: dict) -> None:
        for handler in self._handlers.get(topic, []):
            handler(payload)

    def subscribe(self, topic: str, handler: Callable) -> Callable[[], None]:
        self._handlers.setdefault(topic, []).append(handler)

        def unsubscribe() -> None:
            self._handlers[topic] = [h for h in self._handlers[topic] if h != handler]

        return unsubscribe


bus = EventBus()
