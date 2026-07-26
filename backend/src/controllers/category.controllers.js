
const EventCategory = require("../models/EventCategory");
const logger        = require("../config/logger");

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

const createCategory = async (req, res, next) => {
  try {
    const { name, icon_emoji, image_url, sort_order } = req.body;
    if (!name || !name.trim())
      return res.status(400).json({ error: "name is required." });

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
