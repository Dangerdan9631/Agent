plugins {
    application
    id("dev.atlas.kotlin")
}

atlas {
    models {
        create("jvm") {
            target.set("jvm")
            compilation.set("main")
            modelFile.set(rootProject.file("architecture/models/app-jvm.atlas.module.yml"))
            generateOnBuild.set(true)
        }
    }
}

dependencies {
    implementation(project(":lib"))
    implementation("org.apache.commons:commons-lang3:3.17.0")
    implementation("com.fasterxml.jackson.core:jackson-databind:2.18.3")
}

application {
    mainClass.set("dev.atlas.example.app.Program")
}
