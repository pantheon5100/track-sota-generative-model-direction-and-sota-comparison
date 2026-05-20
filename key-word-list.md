# Keyword List

## Scope

This tracker follows flow-matching and diffusion-family generative modeling progress, with leaderboard attention restricted to class-conditional ImageNet 256x256 generation.

Search policy:

- Pre-2026 data is seeded from the RAE-DiT paper and its ImageNet 256x256 comparison table.
- Automated arXiv discovery should search papers submitted on or after 2026-01-01.
- Papers about video, audio, language, 3D, robotics, medical, or other applications are off-scope unless they also report general image-generation results on ImageNet 256x256.

## Core Query Terms

Use these as high-priority exact-match terms:

- flow matching
- conditional flow matching
- rectified flow
- stochastic interpolants
- optimal transport flow matching
- continuous normalizing flow
- probability flow ODE
- velocity field
- velocity matching
- diffusion model
- diffusion transformer
- DiT
- SiT

## Emerging Method Terms

Use these to catch newer naming around the same research direction:

- MeanFlow
- mean flow
- terminal velocity matching
- shortcut model
- consistency model
- consistency distillation
- flow distillation
- few-step generation
- one-step generation
- ODE sampler
- SDE sampler
- unified continuous generative model
- transport map
- trajectory matching
- trajectory rectification
- velocity correction
- scale schedule
- noise schedule

## Architecture And Backbone Terms

Track these because papers increasingly report results for both DiT-based and SiT-based XL models:

- DiT-XL
- SiT-XL
- LightningDiT
- DDT
- DiT-DH
- DiT with DDT head
- diffusion transformer XL
- scalable interpolant transformer
- latent diffusion transformer
- pixel diffusion transformer
- representation autoencoder
- RAE
- VAE latent
- DINOv2
- SigLIP
- MAE

Normalize backbone fields as:

- `DiT-S`, `DiT-B`, `DiT-L`, `DiT-XL`
- `SiT-S`, `SiT-B`, `SiT-L`, `SiT-XL`
- `DiT-DH-S`, `DiT-DH-B`, `DiT-DH-L`, `DiT-DH-XL`
- `unknown` when the size is not stated

## Benchmark Anchor Terms

Every leaderboard-relevant search should include at least one benchmark anchor:

- ImageNet
- ImageNet-1k
- ImageNet 256
- ImageNet-256
- ImageNet 256x256
- 256x256 generation
- class-conditional ImageNet
- FID
- gFID
- FID-50k
- Inception Score
- IS
- precision
- recall
- NFE
- sampling steps

## Query Templates

Broad discovery:

```text
("flow matching" OR "rectified flow" OR "velocity matching" OR "stochastic interpolants")
AND ("ImageNet" OR "FID" OR "DiT" OR "SiT")
```

Leaderboard discovery:

```text
("ImageNet 256" OR "ImageNet-256" OR "ImageNet 256x256")
AND ("FID" OR "gFID" OR "FID-50k")
AND ("flow matching" OR "diffusion transformer" OR "DiT" OR "SiT" OR "rectified flow")
```

Few-step discovery:

```text
("one-step" OR "few-step" OR "NFE" OR "sampling steps")
AND ("flow matching" OR "diffusion" OR "consistency" OR "velocity")
AND ("ImageNet" OR "FID")
```

DiT/SiT comparison discovery:

```text
("DiT-XL" OR "SiT-XL")
AND ("ImageNet 256" OR "ImageNet-256")
AND ("FID" OR "gFID")
```

## Exclusion Hints

Do not discard papers at query time only because they mention applications. Instead, let the classifier mark them off-scope when:

- the paper has no general image-generation benchmark,
- the paper only evaluates non-ImageNet application data,
- the paper is about recognition, segmentation, captioning, editing, inverse problems, or restoration without an ImageNet generation benchmark,
- the paper uses flow/diffusion only as a component in a non-generative task.

