async function loadJson(url) {
  const response = await fetch(url);

  if (!response.ok)
    throw new Error(`HTTP_${response.status}`);

  return response.json();
}

export async function loadPricingReference() {
  const [suppliers, tariffs, classes, project] =
    await Promise.all([
      loadJson("./data/suppliers.reference.json"),
      loadJson("../config/dictionaries/concrete-price-tariffs.json"),
      loadJson("../config/dictionaries/concrete-classes.json"),
      loadJson("../config/projects/taspazar-camii.json")
    ]);

  return {
    suppliers: suppliers.items ?? [],
    tariffs: tariffs.items ?? [],
    classes: classes.items ?? [],
    project
  };
}
