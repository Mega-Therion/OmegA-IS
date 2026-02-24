"""
WASM Runtime for ΩmegΑ Gateway.
Provides sandboxed execution for API filters and skills.
"""

import os
import logging
import threading
from typing import Optional, List, Dict, Any
from wasmtime import Engine, Store, Module, Linker, Memory, Caller, FuncType, ValType

logger = logging.getLogger("omega.gateway.wasm")

# Thread-local storage for WASM execution context
_context = threading.local()

class WASMManager:
    """
    Manages loading and execution of WASM modules.
    """
    def __init__(self):
        self.engine = Engine()
        self.linker = Linker(self.engine)
        self._register_host_functions()

    def _register_host_functions(self):
        """Register host functions available to WASM modules."""
        
        # Host Import: omega.get_input(ptr, len)
        def get_input(caller: Caller, ptr: int, len_val: int):
            input_data = getattr(_context, "input", "").encode("utf-8")
            mem = self._get_memory(caller)
            if mem:
                to_write = input_data[:len_val]
                mem.write(caller, to_write, ptr)
        
        # Host Import: omega.set_output(ptr, len)
        def set_output(caller: Caller, ptr: int, len_val: int):
            mem = self._get_memory(caller)
            if mem:
                output_bytes = mem.read(caller, ptr, ptr + len_val)
                _context.output = output_bytes.decode("utf-8", errors="replace").strip("\x00")

        # Host Import: omega.log(ptr, len)
        def log_msg(caller: Caller, ptr: int, len_val: int):
            mem = self._get_memory(caller)
            if mem:
                log_bytes = mem.read(caller, ptr, ptr + len_val)
                msg = log_bytes.decode("utf-8", errors="replace").strip("\x00")
                logger.info(f"[WASM LOG] {msg}")

        # Define FuncTypes
        void_i32_i32 = FuncType([ValType.i32(), ValType.i32()], [])

        # Define in both 'omega' and 'env' for compatibility
        for module_name in ["omega", "env"]:
            self.linker.define_func(module_name, "get_input", void_i32_i32, get_input, access_caller=True)
            self.linker.define_func(module_name, "set_output", void_i32_i32, set_output, access_caller=True)
            # self.linker.define_func(module_name, "log", void_i32_i32, log_msg, access_caller=True)

    def _get_memory(self, caller: Caller) -> Optional[Memory]:
        """Helper to get memory export from caller."""
        mem = caller.get("memory")
        if isinstance(mem, Memory):
            return mem
        return None

    def execute_skill(self, wasm_path: str, input_str: str) -> str:
        """
        Execute a WASM skill with the given input.
        """
        if not os.path.exists(wasm_path):
            raise FileNotFoundError(f"WASM module not found: {wasm_path}")

        # Set up context
        _context.input = input_str
        _context.output = ""

        try:
            module = Module.from_file(self.engine, wasm_path)
            store = Store(self.engine)
            instance = self.linker.instantiate(store, module)
            
            # Try to get 'run' function from exports
            exports = instance.exports(store)
            run_func = exports.get("run")
            
            if not run_func:
                raise AttributeError("WASM module does not export a 'run' function")

            run_func(store)
            return _context.output
        finally:
            # Clean up context
            _context.input = ""
            # Don't clear output yet as it's returned

# Global instance
wasm_manager = WASMManager()
