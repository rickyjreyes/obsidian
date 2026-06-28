---
id: EXP-WATER-CAVITY-RESONANCE
type: experiment
title: Water-Cavity Resonance Experiment
object_state: canonical
priority_included: true
scientific_importance: 82
work_urgency: 90
critical_path: true
symbolic_status: NOT_APPLICABLE
formal_status: NOT_APPLICABLE
physical_status: UNREVIEWED
experimental_status: UNREVIEWED
replication_status: not-replicated
source_papers:
  - Research/01 Literature Notes/Long-Lived Photon Resonance in Water Cavities.md
---

# Water-Cavity Resonance Experiment

## Purpose

Canonical experiment record for testing whether coupled optical and acoustic excitation of a water cavity produces a reproducible long-lived optical or electrical response beyond ordinary scattering, fluorescence, thermal relaxation, acoustic ringing, detector recovery, or instrumentation artifacts.

## Prediction

Under a declared cavity geometry and excitation protocol, a repeatable post-drive response may appear with a measurable spectral structure and ringdown that differs from matched optical-only, acoustic-only, thermal, and electronics controls.

This is a research hypothesis and must not be treated as established until the complete control and replication program is satisfied.

## Equipment

- 532 nm optical source
- 700–800 kHz acoustic drive and transducer
- Documented water cavity geometry and material
- PDA100A2 photodiode or fully specified detector
- SDS1104X HD oscilloscope or equivalent acquisition system
- Optical power meter
- Hydrophone or calibrated acoustic-power proxy
- Temperature probes
- Vibration sensor where applicable
- Shielded and light-controlled enclosure

## Independent variables

- Optical power and wavelength
- Acoustic frequency, amplitude, duty cycle, and phase
- Cavity geometry
- Water purity, dissolved gas content, and temperature
- Detector position and orientation
- Excitation duration
- Delay after drive removal

## Dependent variables

- Detector voltage or photocurrent
- Spectral amplitudes and phases
- Ringdown time constant
- Persistence duration
- Estimated quality factor
- Spatial mode pattern
- Difference from matched controls

## Protocol

1. Record the complete apparatus geometry, component identifiers, calibration state, and environmental conditions.
2. Acquire dark and no-drive baselines.
3. Randomize optical-only, acoustic-only, combined-drive, sham, and thermal-control trials.
4. Record optical power, acoustic drive, detector output, temperature, and vibration simultaneously.
5. Preserve raw traces before filtering, averaging, or baseline subtraction.
6. Fit ringdown only with a preregistered model and report alternative fits.
7. Repeat with altered cavity geometry, water condition, detector placement, and independent hardware.

## Controls

- Optical-only control
- Acoustic-only control
- No-water cavity control
- Nonresonant frequency control
- Equal-heating control
- Detector-dark control
- Electronics dummy-load control
- Alternate detector control
- Randomized and blinded trial labels

## Calibration

- Optical power calibration
- Acoustic drive and transducer response calibration
- Detector responsivity and amplifier gain calibration
- Oscilloscope amplitude, bandwidth, and time-base verification
- Temperature and vibration sensor calibration

## Reported observation state

Project notes report persistence and ringdown behavior, including estimates derived from observed decay. These values remain **unreviewed measurements** in this canonical record until the raw traces, fitting procedure, controls, and uncertainty budget are attached and independently reproduced.

## Ringdown and quality factor

Any quality-factor estimate must state:

- resonance frequency used;
- fitted decay model;
- fit interval;
- uncertainty in the decay constant;
- detector and amplifier recovery limits;
- acoustic ringdown contribution;
- thermal relaxation contribution;
- confidence interval for the resulting quality factor.

## Expected result

A valid positive result requires a preregistered post-drive signal exceeding all matched control distributions, robust fitting across reasonable analysis choices, reproducibility across apparatus rebuilds, and exclusion of known detector, acoustic, thermal, and electronic transients.

## Null result criterion

The result is null when combined-drive trials are statistically indistinguishable from controls or when the fitted persistence is explained by ordinary apparatus response within the uncertainty budget.

## Falsifier

The extraordinary-confinement interpretation is rejected when matched controls reproduce the signal, when the response follows known detector or acoustic transfer functions, or when blinded independent replication fails at the declared sensitivity.

## Raw data

- [ ] Raw oscilloscope traces linked
- [ ] Optical-power logs linked
- [ ] Acoustic-drive logs linked
- [ ] Temperature and vibration logs linked
- [ ] Calibration records linked
- [ ] Analysis notebook linked
- [ ] Figures reproducible from raw data

## Replication

- **Internal replication:** not yet documented in this canonical record
- **Independent replication:** none recorded

## What is missing

- [ ] Freeze the primary endpoint and analysis model
- [ ] Attach complete apparatus geometry and calibration records
- [ ] Attach raw traces for positive, null, and failed trials
- [ ] Quantify thermal, acoustic, detector, and electronics backgrounds
- [ ] Report uncertainty for ringdown and quality-factor estimates
- [ ] Repeat across independent hardware and operators
- [ ] Obtain independent replication
