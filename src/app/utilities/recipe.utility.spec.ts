import { ItemId, Mocks, RecipeId } from 'src/tests';
import { spread } from '~/helpers';
import {
  AdjustedRecipe,
  Entities,
  Game,
  Objective,
  ObjectiveType,
  ObjectiveUnit,
  rational,
  Recipe,
  RecipeSettings,
} from '~/models';
import { RecipeUtility } from './recipe.utility';

describe('RecipeUtility', () => {
  describe('bestMatch', () => {
    it('should pick the first option if list only contains one', () => {
      const value = 'value';
      const result = RecipeUtility.bestMatch([value], []);
      expect(result).toEqual(value);
    });

    it('should pick the first match from rank', () => {
      const value = 'value';
      const result = RecipeUtility.bestMatch(
        ['test1', value],
        ['test2', value],
      );
      expect(result).toEqual(value);
    });
  });

  describe('fuelOptions', () => {
    it('should handle entities with no fuel categories', () => {
      const result = RecipeUtility.fuelOptions(
        {} as any,
        Mocks.AdjustedDataset,
      );
      expect(result).toEqual([]);
    });

    it('should handle entity that specifies a fuel', () => {
      const result = RecipeUtility.fuelOptions(
        { fuel: ItemId.Coal } as any,
        Mocks.AdjustedDataset,
      );
      expect(result).toEqual([{ value: ItemId.Coal, label: 'Coal' }]);
    });
  });

  describe('defaultModules', () => {
    it('should fill in modules list for machine', () => {
      const result = RecipeUtility.defaultModules(
        [{ value: ItemId.SpeedModule }],
        [ItemId.ProductivityModule, ItemId.SpeedModule],
        rational(1n),
      );
      expect(result).toEqual([ItemId.SpeedModule]);
    });
  });

  describe('adjustRecipe', () => {
    it('should adjust a standard recipe', () => {
      const settings = { ...Mocks.RecipesState[RecipeId.SteelChest] };
      settings.moduleIds = undefined;
      settings.beacons = [{ moduleIds: [ItemId.SpeedModule] }];
      const result = RecipeUtility.adjustRecipe(
        RecipeId.SteelChest,
        Mocks.AdjustmentData,
        settings,
        Mocks.ItemsStateInitial,
        Mocks.AdjustedDataset,
      );
      const expected: AdjustedRecipe = {
        ...Mocks.AdjustedDataset.recipeEntities[RecipeId.SteelChest],
        ...{
          out: { [ItemId.SteelChest]: rational(1n) },
          time: rational(2n, 3n),
          drain: rational(5n),
          consumption: rational(150n),
          pollution: rational(1n, 20n),
          productivity: rational(1n),
          produces: new Set(),
          output: {},
        },
      };
      expect(result).toEqual(expected);
    });

    it('should handle recipes with declared outputs', () => {
      const result = RecipeUtility.adjustRecipe(
        RecipeId.CopperCable,
        Mocks.AdjustmentData,
        Mocks.RecipesState[RecipeId.CopperCable],
        Mocks.ItemsStateInitial,
        Mocks.AdjustedDataset,
      );
      const expected: AdjustedRecipe = {
        ...Mocks.AdjustedDataset.recipeEntities[RecipeId.CopperCable],
        ...{
          time: rational(2n, 3n),
          drain: rational(5n),
          consumption: rational(150n),
          pollution: rational(1n, 20n),
          productivity: rational(1n),
          produces: new Set(),
          output: {},
        },
      };
      expect(result).toEqual(expected);
    });

    it('should handle research factor', () => {
      const settings = {
        ...Mocks.RecipesState[RecipeId.MiningProductivity],
      };
      settings.machineId = ItemId.Lab;
      const result = RecipeUtility.adjustRecipe(
        RecipeId.MiningProductivity,
        {
          ...Mocks.AdjustmentData,
          ...{ researchBonus: rational(2n) },
        },
        settings,
        Mocks.ItemsStateInitial,
        Mocks.AdjustedDataset,
      );
      const expected: AdjustedRecipe = {
        ...Mocks.AdjustedDataset.recipeEntities[RecipeId.MiningProductivity],
        ...{
          out: { [ItemId.MiningProductivity]: rational(1n) },
          time: rational(30n),
          drain: undefined,
          consumption: rational(60n),
          pollution: rational(0n),
          productivity: rational(1n),
          produces: new Set(),
          output: {},
        },
      };
      expect(result).toEqual(expected);
    });

    it('should handle mining productivity', () => {
      const settings = { ...Mocks.RecipesState[RecipeId.IronOre] };
      settings.machineId = ItemId.ElectricMiningDrill;
      const result = RecipeUtility.adjustRecipe(
        RecipeId.IronOre,
        {
          ...Mocks.AdjustmentData,
          ...{ miningBonus: rational(2n) },
        },
        settings,
        Mocks.ItemsStateInitial,
        Mocks.AdjustedDataset,
      );
      const expected: AdjustedRecipe = {
        ...Mocks.AdjustedDataset.recipeEntities[RecipeId.IronOre],
        ...{
          out: { [ItemId.IronOre]: rational(3n) },
          time: rational(2n),
          drain: undefined,
          consumption: rational(90n),
          pollution: rational(1n, 6n),
          productivity: rational(3n),
          produces: new Set(),
          output: {},
        },
      };
      expect(result).toEqual(expected);
    });

    it('should handle modules and beacons', () => {
      const settings = { ...Mocks.RecipesState[RecipeId.SteelChest] };
      settings.moduleIds = [
        ItemId.SpeedModule,
        ItemId.ProductivityModule,
        ItemId.EfficiencyModule,
      ];
      settings.beacons = [
        {
          id: ItemId.Beacon,
          count: rational(1n),
          moduleIds: [ItemId.SpeedModule, ItemId.SpeedModule],
        },
      ];
      const data = {
        ...Mocks.AdjustedDataset,
        ...{
          moduleEntities: {
            ...Mocks.AdjustedDataset.moduleEntities,
            ...{
              // To verify all factors work in beacons
              [ItemId.SpeedModule]: {
                ...Mocks.AdjustedDataset.moduleEntities[ItemId.SpeedModule],
                ...{ productivity: rational(1n), pollution: rational(1n) },
              },
              // To verify null consumption works
              [ItemId.ProductivityModule]: {
                ...Mocks.AdjustedDataset.moduleEntities[
                  ItemId.ProductivityModule
                ],
                ...{ consumption: undefined },
              },
            },
          },
        },
      };
      const result = RecipeUtility.adjustRecipe(
        RecipeId.SteelChest,
        Mocks.AdjustmentData,
        settings,
        Mocks.ItemsStateInitial,
        data,
      );
      const expected: AdjustedRecipe = {
        ...Mocks.AdjustedDataset.recipeEntities[RecipeId.SteelChest],
        ...{
          out: { [ItemId.SteelChest]: rational(76n, 25n) },
          time: rational(40n, 81n),
          drain: rational(5n),
          consumption: rational(255n),
          pollution: rational(1037n, 4000n),
          productivity: rational(76n, 25n),
          produces: new Set(),
          output: {},
        },
      };
      expect(result).toEqual(expected);
    });

    it('should use minimum 20% effects', () => {
      const settings = { ...Mocks.RecipesState[RecipeId.SteelChest] };
      settings.moduleIds = [
        ItemId.EfficiencyModule3,
        ItemId.EfficiencyModule3,
        ItemId.EfficiencyModule3,
      ];
      // Set up efficiency module 3 to cause more than maximum effect in speed, consumption, and pollution
      const data = {
        ...Mocks.AdjustedDataset,
        ...{
          moduleEntities: {
            ...Mocks.AdjustedDataset.moduleEntities,
            ...{
              [ItemId.EfficiencyModule3]: {
                ...Mocks.AdjustedDataset.moduleEntities[
                  ItemId.EfficiencyModule3
                ],
                ...{
                  speed:
                    Mocks.AdjustedDataset.moduleEntities[
                      ItemId.EfficiencyModule3
                    ].consumption,
                  pollution:
                    Mocks.AdjustedDataset.moduleEntities[
                      ItemId.EfficiencyModule3
                    ].consumption,
                },
              },
            },
          },
        },
      };
      settings.beacons = [{ count: rational(0n), moduleIds: [ItemId.Module] }];
      const result = RecipeUtility.adjustRecipe(
        RecipeId.SteelChest,
        Mocks.AdjustmentData,
        settings,
        Mocks.ItemsStateInitial,
        data,
      );
      const expected: AdjustedRecipe = {
        ...Mocks.AdjustedDataset.recipeEntities[RecipeId.SteelChest],
        ...{
          out: { [ItemId.SteelChest]: rational(1n) },
          time: rational(10n, 3n),
          drain: rational(5n),
          consumption: rational(30n),
          pollution: rational(1n, 500n),
          productivity: rational(1n),
          produces: new Set(),
          output: {},
        },
      };
      expect(result).toEqual(expected);
    });

    it('should use minimum 1/60 second time in Factorio', () => {
      const data = Mocks.getAdjustedDataset();
      data.recipeEntities[RecipeId.SteelChest] = {
        ...data.recipeEntities[RecipeId.SteelChest],
        ...{ time: rational(1n, 10000n) },
      };
      const result = RecipeUtility.adjustRecipe(
        RecipeId.SteelChest,
        Mocks.AdjustmentData,
        Mocks.RecipesStateInitial[RecipeId.SteelChest],
        Mocks.ItemsStateInitial,
        data,
      );
      expect(result.time).toEqual(rational(1n, 60n));
    });

    it('should find matching nonchemical fuel', () => {
      const result = RecipeUtility.adjustRecipe(
        RecipeId.UsedUpUraniumFuelCell,
        Mocks.AdjustmentData,
        Mocks.RecipesStateInitial[RecipeId.UsedUpUraniumFuelCell],
        Mocks.ItemsStateInitial,
        Mocks.AdjustedDataset,
      );
      expect(result.in[ItemId.UraniumFuelCell]).toEqual(rational(1n, 200n));
    });

    it('should find non-matching nonchemical fuel', () => {
      const data = {
        ...Mocks.AdjustedDataset,
        ...{
          recipeEntities: {
            ...Mocks.AdjustedDataset.recipeEntities,
            ...{
              [RecipeId.UsedUpUraniumFuelCell]: {
                ...Mocks.AdjustedDataset.recipeEntities[
                  RecipeId.UsedUpUraniumFuelCell
                ],
                ...{ in: {}, out: {} },
              },
            },
          },
        },
      };
      const result = RecipeUtility.adjustRecipe(
        RecipeId.UsedUpUraniumFuelCell,
        Mocks.AdjustmentData,
        Mocks.RecipesStateInitial[RecipeId.UsedUpUraniumFuelCell],
        Mocks.ItemsStateInitial,
        data,
      );
      expect(result.in[ItemId.UraniumFuelCell]).toEqual(rational(1n, 200n));
    });

    it('should adjust based on overclock', () => {
      const settings = { ...Mocks.RecipesState[RecipeId.SteelChest] };
      settings.overclock = rational(200n);
      const result = RecipeUtility.adjustRecipe(
        RecipeId.SteelChest,
        Mocks.AdjustmentData,
        settings,
        Mocks.ItemsStateInitial,
        Mocks.AdjustedDataset,
      );
      const expected: AdjustedRecipe = {
        ...Mocks.AdjustedDataset.recipeEntities[RecipeId.SteelChest],
        ...{
          out: { [ItemId.SteelChest]: rational(1n) },
          time: rational(1n, 3n),
          drain: rational(5n),
          consumption: rational(136838616n, 364903n),
          pollution: rational(1n, 20n),
          productivity: rational(1n),
          produces: new Set(),
          output: {},
        },
      };
      expect(result).toEqual(expected);
    });

    it('should adjust a power producer based on overclock', () => {
      const settings = { ...Mocks.RecipesState[RecipeId.SteelChest] };
      settings.overclock = rational(200n);
      const data = Mocks.getDataset();
      data.machineEntities[ItemId.AssemblingMachine2].usage = rational(-10n);
      const result = RecipeUtility.adjustRecipe(
        RecipeId.SteelChest,
        Mocks.AdjustmentData,
        settings,
        Mocks.ItemsStateInitial,
        data,
      );
      const expected: AdjustedRecipe = {
        ...Mocks.AdjustedDataset.recipeEntities[RecipeId.SteelChest],
        ...{
          out: { [ItemId.SteelChest]: rational(1n) },
          time: rational(1n, 3n),
          drain: rational(5n),
          consumption: rational(-20n),
          pollution: rational(1n, 20n),
          productivity: rational(1n),
          produces: new Set(),
          output: {},
        },
      };
      expect(result).toEqual(expected);
    });

    it('should use a recipe specific usage', () => {
      const settings = { ...Mocks.RecipesState[RecipeId.SteelChest] };
      const data = {
        ...Mocks.Dataset,
        ...{
          recipeEntities: {
            ...Mocks.Dataset.recipeEntities,
            ...{
              [RecipeId.SteelChest]: {
                ...Mocks.Dataset.recipeEntities[RecipeId.SteelChest],
                ...{
                  usage: rational(10000n),
                },
              },
            },
          },
        },
      };
      const result = RecipeUtility.adjustRecipe(
        RecipeId.SteelChest,
        Mocks.AdjustmentData,
        settings,
        Mocks.ItemsStateInitial,
        data,
      );
      const expected: AdjustedRecipe = {
        ...Mocks.AdjustedDataset.recipeEntities[RecipeId.SteelChest],
        ...{
          out: { [ItemId.SteelChest]: rational(1n) },
          time: rational(2n, 3n),
          drain: rational(5n),
          consumption: rational(10000n),
          pollution: rational(1n, 20n),
          productivity: rational(1n),
          usage: rational(10000n),
          produces: new Set(),
          output: {},
        },
      };
      expect(result).toEqual(expected);
    });

    it('should calculate proliferator usage', () => {
      const settings: RecipeSettings = spread(
        Mocks.RecipesStateInitial[ItemId.SteelChest],
        { moduleIds: [ItemId.ProductivityModule3] },
      );
      const recipe = {
        ...Mocks.Dataset.recipeEntities[RecipeId.SteelChest],
        ...{
          in: {
            ...Mocks.Dataset.recipeEntities[RecipeId.SteelChest].in,
            ...{ [ItemId.ProductivityModule]: rational(1n) },
          },
        },
      };
      const data = {
        ...Mocks.Dataset,
        ...{
          recipeEntities: {
            ...Mocks.Dataset.recipeEntities,
            ...{
              [RecipeId.SteelChest]: recipe,
            },
          },
          moduleEntities: {
            ...Mocks.Dataset.moduleEntities,
            ...{
              [ItemId.ProductivityModule3]: {
                ...Mocks.Dataset.moduleEntities[ItemId.ProductivityModule3],
                ...{
                  sprays: rational(10n),
                  proliferator: ItemId.ProductivityModule3,
                },
              },
              [ItemId.ProductivityModule]: {
                ...Mocks.Dataset.moduleEntities[ItemId.ProductivityModule],
                ...{
                  sprays: rational(10n),
                  proliferator: ItemId.ProductivityModule,
                },
              },
            },
          },
        },
      };
      const result = RecipeUtility.adjustRecipe(
        RecipeId.SteelChest,
        {
          ...Mocks.AdjustmentData,
          ...{ proliferatorSprayId: ItemId.ProductivityModule },
        },
        settings,
        Mocks.ItemsStateInitial,
        data,
      );
      const expected: AdjustedRecipe = {
        ...recipe,
        ...{
          in: {
            [ItemId.SteelPlate]: rational(8n),
            [ItemId.ProductivityModule]: rational(11n, 10n),
            [ItemId.ProductivityModule3]: rational(9n, 10n),
          },
          out: { [ItemId.SteelChest]: rational(11n, 10n) },
          time: rational(8n, 97n),
          drain: rational(25n, 2n),
          consumption: rational(2775n),
          pollution: rational(407n, 1500n),
          productivity: rational(11n, 10n),
          produces: new Set(),
          output: {},
        },
      };
      expect(result).toEqual(expected);
    });

    it('should add machine consumption', () => {
      const data = Mocks.getDataset();
      data.machineEntities[ItemId.AssemblingMachine2].consumption = {
        [ItemId.Coal]: rational(1n),
      };
      const result = RecipeUtility.adjustRecipe(
        RecipeId.CopperCable,
        Mocks.AdjustmentData,
        Mocks.RecipesState[RecipeId.CopperCable],
        Mocks.ItemsStateInitial,
        data,
      );
      const expected: AdjustedRecipe = {
        ...Mocks.Dataset.recipeEntities[RecipeId.CopperCable],
        ...{
          in: {
            [ItemId.CopperPlate]: rational(1n),
            [ItemId.Coal]: rational(1n, 90n),
          },
          time: rational(2n, 3n),
          drain: rational(5n),
          consumption: rational(150n),
          pollution: rational(1n, 20n),
          productivity: rational(1n),
          produces: new Set(),
          output: {},
        },
      };
      expect(result).toEqual(expected);
    });

    it('should reduce net production to output only', () => {
      const data = Mocks.getDataset();
      data.recipeEntities[RecipeId.CoalLiquefaction].in[ItemId.HeavyOil] =
        rational(1n);
      data.recipeEntities[RecipeId.CoalLiquefaction].out[ItemId.HeavyOil] =
        rational(2n);
      const result = RecipeUtility.adjustRecipe(
        RecipeId.CoalLiquefaction,
        {
          ...Mocks.AdjustmentData,
          ...{ netProductionOnly: true },
        },
        Mocks.RecipesState[RecipeId.CoalLiquefaction],
        Mocks.ItemsStateInitial,
        data,
      );
      expect(result.in[ItemId.HeavyOil]).toBeUndefined();
      expect(result.out[ItemId.HeavyOil]).toEqual(rational(1n));
    });

    it('should reduce net production to input only', () => {
      const data = Mocks.getDataset();
      data.recipeEntities[RecipeId.CoalLiquefaction].in[ItemId.HeavyOil] =
        rational(2n);
      data.recipeEntities[RecipeId.CoalLiquefaction].out[ItemId.HeavyOil] =
        rational(1n);
      const result = RecipeUtility.adjustRecipe(
        RecipeId.CoalLiquefaction,
        {
          ...Mocks.AdjustmentData,
          ...{ netProductionOnly: true },
        },
        Mocks.RecipesState[RecipeId.CoalLiquefaction],
        Mocks.ItemsStateInitial,
        data,
      );
      expect(result.in[ItemId.HeavyOil]).toEqual(rational(1n));
      expect(result.out[ItemId.HeavyOil]).toBeUndefined();
    });

    it('should reduce net production to no input/output', () => {
      const data = Mocks.getDataset();
      data.recipeEntities[RecipeId.CoalLiquefaction].in[ItemId.HeavyOil] =
        rational(1n);
      data.recipeEntities[RecipeId.CoalLiquefaction].out[ItemId.HeavyOil] =
        rational(1n);
      const result = RecipeUtility.adjustRecipe(
        RecipeId.CoalLiquefaction,
        {
          ...Mocks.AdjustmentData,
          ...{ netProductionOnly: true },
        },
        Mocks.RecipesState[RecipeId.CoalLiquefaction],
        Mocks.ItemsStateInitial,
        data,
      );
      expect(result.in[ItemId.HeavyOil]).toBeUndefined();
      expect(result.out[ItemId.HeavyOil]).toBeUndefined();
    });

    it('should calculate machine speed based on belt speed if undefined', () => {
      const data = Mocks.getDataset();
      data.machineEntities[ItemId.AssemblingMachine2].speed = undefined;
      const result = RecipeUtility.adjustRecipe(
        RecipeId.SteelChest,
        Mocks.AdjustmentData,
        Mocks.RecipesState[RecipeId.SteelChest],
        Mocks.ItemsStateInitial,
        data,
      );
      const expected: AdjustedRecipe = {
        ...Mocks.AdjustedDataset.recipeEntities[RecipeId.SteelChest],
        ...{
          out: { [ItemId.SteelChest]: rational(1n) },
          time: rational(1n, 30n),
          drain: rational(5n),
          consumption: rational(150n),
          pollution: rational(1n, 20n),
          productivity: rational(1n),
          produces: new Set(),
          output: {},
        },
      };
      expect(result).toEqual(expected);
    });

    it('should adjust based on number of Final Factory duplicators', () => {
      const data = Mocks.getDataset();
      data.game = Game.FinalFactory;
      const settings = {
        ...Mocks.RecipesState[RecipeId.SteelChest],
        ...{ overclock: undefined },
      };

      const result = RecipeUtility.adjustRecipe(
        RecipeId.SteelChest,
        Mocks.AdjustmentData,
        settings,
        Mocks.ItemsStateInitial,
        data,
      );
      const expected: AdjustedRecipe = {
        ...Mocks.AdjustedDataset.recipeEntities[RecipeId.SteelChest],
        ...{
          out: { [ItemId.SteelChest]: rational(1n) },
          time: rational(2n, 3n),
          drain: rational(5n),
          consumption: rational(150n),
          pollution: rational(1n, 20n),
          productivity: rational(1n),
          produces: new Set(),
          output: {},
        },
      };
      expect(result).toEqual(expected);
    });
  });

  describe('adjustLaunchRecipeObjective', () => {
    it('should skip non-launch objectives', () => {
      const recipe = { ...Mocks.Dataset.recipeEntities[RecipeId.IronPlate] };
      const time = recipe.time;

      // No recipe part
      RecipeUtility.adjustLaunchRecipeObjective(
        recipe,
        Mocks.RecipesStateInitial,
        Mocks.AdjustedDataset,
      );
      expect(recipe.time).toEqual(time);

      // No silo
      recipe.part = ItemId.IronPlate;
      RecipeUtility.adjustLaunchRecipeObjective(
        recipe,
        Mocks.RecipesStateInitial,
        Mocks.AdjustedDataset,
      );
      expect(recipe.time).toEqual(time);

      // No machine id
      const settings = Mocks.getRecipesState();
      delete settings[RecipeId.IronPlate].machineId;
      RecipeUtility.adjustLaunchRecipeObjective(
        recipe,
        settings,
        Mocks.AdjustedDataset,
      );
      expect(recipe.time).toEqual(time);
    });

    it('should adjust a launch objective based on rocket part recipe', () => {
      const objective: Objective = {
        id: '0',
        targetId: RecipeId.SpaceSciencePack,
        value: rational(1n),
        unit: ObjectiveUnit.Machines,
        type: ObjectiveType.Output,
      };
      const recipe = RecipeUtility.adjustRecipe(
        objective.targetId,
        Mocks.AdjustmentData,
        objective,
        Mocks.ItemsStateInitial,
        Mocks.Dataset,
      );
      RecipeUtility.adjustLaunchRecipeObjective(
        recipe,
        Mocks.RecipesStateInitial,
        Mocks.AdjustedDataset,
      );
      expect(recipe.time).toEqual(rational(82499n, 924n));
    });
  });

  describe('adjustSiloRecipes', () => {
    let adjustedRecipe: Entities<AdjustedRecipe>;

    beforeEach(() => {
      adjustedRecipe = Mocks.Dataset.recipeIds.reduce(
        (e: Entities<AdjustedRecipe>, i) => {
          e[i] = RecipeUtility.adjustRecipe(
            i,
            Mocks.AdjustmentData,
            Mocks.RecipesStateInitial[i],
            Mocks.ItemsStateInitial,
            Mocks.Dataset,
          );
          return e;
        },
        {},
      );
    });

    it('should adjust recipes', () => {
      const result = RecipeUtility.adjustSiloRecipes(
        adjustedRecipe,
        Mocks.RecipesStateInitial,
        Mocks.Dataset,
      );
      expect(result[RecipeId.SpaceSciencePack].time).toEqual(
        rational(82499n, 924n),
      );
      expect(result[RecipeId.RocketPart].time).toEqual(
        rational(82499n, 66000n),
      );
    });

    it('should handle invalid machine', () => {
      const settings2 = {
        ...Mocks.RecipesStateInitial,
        ...{
          [RecipeId.SpaceSciencePack]: {
            machineId: 'id',
          },
        },
      };
      const result = RecipeUtility.adjustSiloRecipes(
        adjustedRecipe,
        settings2,
        Mocks.Dataset,
      );
      expect(result[RecipeId.SpaceSciencePack].time).toEqual(
        rational(203n, 5n),
      );
      expect(result[RecipeId.RocketPart].time).toEqual(
        rational(82499n, 66000n),
      );
    });

    it('should handle missing machine id', () => {
      const settings2 = {
        ...Mocks.RecipesStateInitial,
        ...{
          [RecipeId.SpaceSciencePack]: {
            machineId: '',
          },
        },
      };
      const result = RecipeUtility.adjustSiloRecipes(
        adjustedRecipe,
        settings2,
        Mocks.Dataset,
      );
      expect(result[RecipeId.SpaceSciencePack].time).toEqual(
        rational(203n, 5n),
      );
      expect(result[RecipeId.RocketPart].time).toEqual(
        rational(82499n, 66000n),
      );
    });
  });

  describe('allowsModules', () => {
    it('should check machine and rocket recipes', () => {
      // Silo recipes
      expect(
        RecipeUtility.allowsModules(
          Mocks.AdjustedDataset.recipeEntities[RecipeId.RocketPart],
          Mocks.AdjustedDataset.machineEntities[ItemId.RocketSilo],
        ),
      ).toBeTrue();
      expect(
        RecipeUtility.allowsModules(
          Mocks.AdjustedDataset.recipeEntities[RecipeId.SpaceSciencePack],
          Mocks.AdjustedDataset.machineEntities[ItemId.RocketSilo],
        ),
      ).toBeFalse();
      // Normal recipes
      expect(
        RecipeUtility.allowsModules(
          Mocks.AdjustedDataset.recipeEntities[ItemId.Coal],
          Mocks.AdjustedDataset.machineEntities[ItemId.ElectricMiningDrill],
        ),
      ).toBeTrue();
      expect(
        RecipeUtility.allowsModules(
          Mocks.AdjustedDataset.recipeEntities[ItemId.Coal],
          Mocks.AdjustedDataset.machineEntities[ItemId.BurnerMiningDrill],
        ),
      ).toBeFalse();
    });
  });

  describe('adjustDataset', () => {
    it('should adjust recipes and silo recipes', () => {
      spyOn(RecipeUtility, 'adjustSiloRecipes').and.callThrough();
      spyOn(RecipeUtility, 'adjustRecipe').and.callThrough();
      const result = RecipeUtility.adjustDataset(
        Mocks.AdjustedDataset.recipeIds,
        [],
        Mocks.RecipesStateInitial,
        Mocks.ItemsStateInitial,
        Mocks.AdjustmentData,
        Mocks.Costs,
        Mocks.AdjustedDataset,
      );
      expect(result).toBeTruthy();
      expect(RecipeUtility.adjustSiloRecipes).toHaveBeenCalledTimes(1);
      expect(RecipeUtility.adjustRecipe).toHaveBeenCalledTimes(
        Mocks.AdjustedDataset.recipeIds.length,
      );
    });
  });

  describe('adjustCost', () => {
    let recipeR: Entities<Recipe>;

    beforeEach(() => {
      recipeR = RecipeUtility.adjustRecipes(
        Mocks.AdjustedDataset.recipeIds,
        Mocks.RecipesStateInitial,
        Mocks.ItemsStateInitial,
        Mocks.AdjustmentData,
        Mocks.AdjustedDataset,
      );
    });

    it('should apply an overridden cost', () => {
      const recipeSettings = {
        ...Mocks.RecipesStateInitial,
        ...{
          [RecipeId.Coal]: {
            ...Mocks.RecipesStateInitial[RecipeId.Coal],
            ...{ cost: rational(2n) },
          },
        },
      };
      RecipeUtility.adjustCost(
        Mocks.AdjustedDataset.recipeIds,
        recipeR,
        recipeSettings,
        Mocks.Costs,
        Mocks.AdjustedDataset,
      );
      expect(recipeR[RecipeId.Coal].cost).toEqual(rational(2n));
    });

    it('should apply normal recipe and machine costs', () => {
      RecipeUtility.adjustCost(
        Mocks.AdjustedDataset.recipeIds,
        recipeR,
        Mocks.RecipesStateInitial,
        Mocks.Costs,
        Mocks.AdjustedDataset,
      );
      expect(recipeR[RecipeId.Coal].cost).toEqual(rational(1183n, 4n));
      expect(recipeR[RecipeId.CopperCable].cost).toEqual(rational(9n));
    });
  });

  describe('adjustObjective', () => {
    it('should return an item objective unaltered', () => {
      expect(
        RecipeUtility.adjustObjective(
          Mocks.Objective1,
          Mocks.ItemsStateInitial,
          Mocks.RecipesStateInitial,
          Mocks.MachinesStateInitial,
          Mocks.AdjustmentData,
          Mocks.AdjustedDataset,
        ),
      ).toEqual(Mocks.Objective1);
    });

    it('should adjust a recipe objective based on settings', () => {
      const result = RecipeUtility.adjustObjective(
        {
          id: '1',
          targetId: RecipeId.IronPlate,
          value: rational(1n),
          unit: ObjectiveUnit.Machines,
          type: ObjectiveType.Output,
        },
        Mocks.ItemsStateInitial,
        Mocks.RecipesStateInitial,
        Mocks.MachinesStateInitial,
        Mocks.AdjustmentData,
        Mocks.AdjustedDataset,
      );
      expect(result.machineId).toEqual(ItemId.ElectricFurnace);
      expect(result.moduleOptions?.length).toEqual(10);
      expect(result.moduleIds).toEqual([
        ItemId.ProductivityModule3,
        ItemId.ProductivityModule3,
      ]);
      expect(result.beacons?.[0].count).toEqual(rational(8n));
      expect(result.beacons?.[0].id).toEqual(ItemId.Beacon);
      expect(result.beacons?.[0].moduleOptions?.length).toEqual(7);
      expect(result.beacons?.[0].moduleIds).toEqual([
        ItemId.SpeedModule3,
        ItemId.SpeedModule3,
      ]);
      expect(result.overclock).toBeUndefined();
    });

    it('should handle a machine with no modules', () => {
      const machines = {
        ...Mocks.MachinesStateInitial,
        ...{ ids: undefined },
      };
      const result = RecipeUtility.adjustObjective(
        {
          id: '1',
          targetId: RecipeId.IronPlate,
          value: rational(1n),
          unit: ObjectiveUnit.Machines,
          type: ObjectiveType.Output,
        },
        Mocks.ItemsStateInitial,
        Mocks.RecipesStateInitial,
        machines,
        Mocks.AdjustmentData,
        Mocks.AdjustedDataset,
      );
      expect(result.machineId).toEqual(ItemId.StoneFurnace);
    });

    it('should handle nullish values', () => {
      spyOn(RecipeUtility, 'allowsModules').and.returnValue(true);
      const data = Mocks.getAdjustedDataset();
      data.machineEntities[ItemId.StoneFurnace].modules = undefined;
      const machines = {
        ...Mocks.MachinesStateInitial,
        ...{
          ids: undefined,
          entities: {
            ...Mocks.MachinesStateInitial.entities,
            ...{
              [ItemId.ElectricFurnace]: {
                ...Mocks.MachinesStateInitial.entities[ItemId.ElectricFurnace],
                ...{
                  moduleRankIds: undefined,
                  beaconModuleRankIds: undefined,
                },
              },
            },
          },
        },
      };
      const result = RecipeUtility.adjustObjective(
        {
          id: '1',
          targetId: RecipeId.IronPlate,
          value: rational(1n),
          unit: ObjectiveUnit.Machines,
          type: ObjectiveType.Output,
          beacons: [{ id: ItemId.Beacon }],
        },
        Mocks.ItemsStateInitial,
        Mocks.RecipesStateInitial,
        machines,
        Mocks.AdjustmentData,
        data,
      );
      expect(result.machineId).toEqual(ItemId.StoneFurnace);
      expect(result.moduleIds).toEqual([]);
      expect(result.beacons?.[0].moduleIds).toEqual([
        ItemId.Module,
        ItemId.Module,
      ]);
    });

    it('should use the correct fuel for a burn recipe objective', () => {
      const result = RecipeUtility.adjustObjective(
        {
          id: '1',
          targetId: RecipeId.UsedUpUraniumFuelCell,
          value: rational(1n),
          unit: ObjectiveUnit.Machines,
          type: ObjectiveType.Output,
          fuelId: ItemId.Coal,
        },
        Mocks.ItemsStateInitial,
        Mocks.RecipesStateInitial,
        Mocks.MachinesStateInitial,
        Mocks.AdjustmentData,
        Mocks.AdjustedDataset,
      );
      expect(result.fuelId).toEqual(ItemId.UraniumFuelCell);
    });
  });
});
