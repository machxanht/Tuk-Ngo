"""Compatibility entrypoint for the current two-button race regression gate."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name("check-simple-race.py")),run_name="__main__")
