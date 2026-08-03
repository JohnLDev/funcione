# Public Content For AdSense Design

## Goal

Increase the amount of useful public publisher content available before sign-in, improving the site review surface for Google AdSense while keeping ads away from low-content, login, loading, and behavioral screens.

## Scope

Create these public pages:

- `/sobre`
- `/guias/rotina-de-treino-personalizada`
- `/guias/treino-em-casa-academia-quadra`
- `/guias/seguranca-recuperacao-lesoes`
- `/perguntas-frequentes`

The existing `/treino-personalizado` page remains the public entry point and links to the new content.

## Content Rules

- The `/sobre` page must not mention AI, artificial intelligence, IA, algorithms, models, or automated generation.
- Public pages should be editorial and practical, not marketing-only.
- Health and safety copy must avoid medical claims and make clear that professional guidance is appropriate for specific conditions.
- Ads can appear only after meaningful article content, using the existing pre-footer placement.
- Login, loading, legal-only navigation, profile completion, empty dashboard, and generation screens remain ad-free.

## Architecture

Add a reusable public editorial screen that renders content from localized data. This keeps routes small, keeps copy centralized, and avoids duplicating the header, footer, CTA, and pre-footer ad structure.

The shared public layout should include:

- Funcione brand header with settings and sign-in access.
- Article heading, subtitle, section content, and internal links.
- A compact public footer linking to guide, about, FAQ, terms, and privacy.
- `PreFooterAd` after article content for content pages only.

## Navigation

The public content graph should be crawlable without authentication:

- `/treino-personalizado` links to `/sobre`, `/perguntas-frequentes`, and the three guide pages.
- Public footer links include `/sobre`, `/perguntas-frequentes`, `/treino-personalizado`, `/terms`, and `/privacy`.
- `/login` keeps links to the guide, terms, and privacy.

## Testing

Add E2E coverage that verifies:

- Each new route is public and shows a specific heading.
- The About page does not contain AI-related wording.
- The existing training guide links to the new public content.
- Public pages keep a pre-footer ad after content.
- Mobile viewport has no horizontal overflow.

## Risks

AdSense approval is not guaranteed. This work addresses the prior low-content screen violation and increases public editorial depth, but Google may still request more original content, a custom domain, consent tooling, or other site quality improvements.
