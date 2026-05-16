/**
 * category.controllers.js
 * Admin: full CRUD on event_categories
 * Public: GET active categories (used by organizer + user dashboards)
 */

const EventCategory = require("../models/EventCategory");
const logger        = require("../config/logger");

// ── Public: list active categories ───────────────────────────────────────────
// GET /categories  (no auth required)
const listCategories = async (req, res, next) => {
  try {
    const categories = await EventCategory.findAll({
      where: { is_active: true },
      order: [["sort_order", "ASC"], ["name", "ASC"]],
    });
    res.json(categories);
  } catch (err) {
    logger.error("listCategories failed", { error: err.message });
    next(err);
  }
};

// ── Admin: list ALL categories (including inactive) ───────────────────────────
// GET /admin/categories
const adminListCategories = async (req, res, next) => {
  try {
    const categories = await EventCategory.findAll({
      order: [["sort_order", "ASC"], ["name", "ASC"]],
    });
    res.json(categories);
  } catch (err) {
    logger.error("adminListCategories failed", { error: err.message });
    next(err);
  }
};

// ── Admin: create category ────────────────────────────────────────────────────
// POST /admin/categories
const createCategory = async (req, res, next) => {
  try {
    const { name, icon_emoji, image_url, sort_order } = req.body;
    if (!name || !name.trim())
      return res.status(400).json({ error: "name is required." });

    // Auto-generate slug from name (PascalCase, strip spaces)
    const slug = name.trim().replace(/\s+/g, "_");

    const existing = await EventCategory.findOne({ where: { slug } });
    if (existing)
      return res.status(409).json({ error: `Category "${name}" already exists.` });

    const cat = await EventCategory.create({
      name:       name.trim(),
      slug,
      icon_emoji: icon_emoji || "🎟️",
      image_url:  image_url  || null,
      sort_order: sort_order != null ? parseInt(sort_order) : 0,
      is_active:  true,
    });

    logger.info("Category created", { adminId: req.user.id, categoryId: cat.id, name: cat.name });
    res.status(201).json(cat);
  } catch (err) {
    logger.error("createCategory failed", { error: err.message });
    next(err);
  }
};

// ── Admin: update category ────────────────────────────────────────────────────
// PUT /admin/categories/:id
const updateCategory = async (req, res, next) => {
  try {
    const cat = await EventCategory.findByPk(req.params.id);
    if (!cat) return res.status(404).json({ error: "Category not found." });

    const { name, icon_emoji, image_url, sort_order, is_active } = req.body;

    if (name !== undefined) {
      cat.name = name.trim();
      cat.slug = name.trim().replace(/\s+/g, "_");
    }
    if (icon_emoji  !== undefined) cat.icon_emoji  = icon_emoji;
    if (image_url   !== undefined) cat.image_url   = image_url;
    if (sort_order  !== undefined) cat.sort_order  = parseInt(sort_order);
    if (is_active   !== undefined) cat.is_active   = !!is_active;

    await cat.save();
    logger.info("Category updated", { adminId: req.user.id, categoryId: cat.id });
    res.json(cat);
  } catch (err) {
    logger.error("updateCategory failed", { error: err.message });
    next(err);
  }
};

// ── Admin: delete category ────────────────────────────────────────────────────
// DELETE /admin/categories/:id
const deleteCategory = async (req, res, next) => {
  try {
    const cat = await EventCategory.findByPk(req.params.id);
    if (!cat) return res.status(404).json({ error: "Category not found." });

    await cat.destroy();
    logger.info("Category deleted", { adminId: req.user.id, categoryId: req.params.id });
    res.json({ message: "Category deleted." });
  } catch (err) {
    logger.error("deleteCategory failed", { error: err.message });
    next(err);
  }
};

module.exports = { listCategories, adminListCategories, createCategory, updateCategory, deleteCategory };
